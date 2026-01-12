import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAstraDB, getCassandraClient } from "@/lib/astra/connection";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { upsertHotelContent, normalizeVersionToTag } from "@/lib/astra/hotelContent";
import { setCurrentVersionInIndex } from "@/lib/astra/hotelVersionIndex";
import type { HotelContent } from "@/types/hotelContent";
import { verifyJWT } from "@/lib/auth/jwt";

function normalize(v: string | null | undefined) {
    return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function inferType(category: string, promptKey: string): HotelContent["type"] {
    const PLAYBOOK_KEYS = new Set([
        "reservation_flow",
        "modify_reservation",
        "reservation_snapshot",
        "reservation_verify",
        "ambiguity_policy",
    ]);
    return PLAYBOOK_KEYS.has(promptKey) ? "playbook" : "standard";
}

function extractTitle(body: string | undefined): string | undefined {
    if (!body) return undefined;
    const m = body.match(/^\s*#\s+(.+)\s*$/m);
    return m ? m[1].trim() : undefined;
}

export async function POST(req: NextRequest) {
    // Auth: header x-admin-key o cookie (panel)
    const search = new URL(req.url).searchParams;
    const hdrKey = normalize(req.headers.get("x-admin-key"));
    const qpKey = normalize(search.get("x-admin-key") || search.get("admin_key") || search.get("adminKey"));
    const providedKey = hdrKey || qpKey;
    const envKey = normalize(process.env.ADMIN_API_KEY);
    const headerAuthOk = !!envKey && providedKey === envKey;

    let cookieAuthOk = false;
    const token = req.cookies.get("token")?.value;
    if (token) {
        const payload = await verifyJWT(token);
        cookieAuthOk = !!payload;
    }
    if (!headerAuthOk && !cookieAuthOk) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const hotelId: string = (body?.hotelId || "").trim();
    const categoryId: string = (body?.categoryId || "").trim();
    const lang: string = (body?.lang || "es").trim().toLowerCase();
    let version: string = (body?.version || "v1").toString();
    const setCurrent: boolean = body?.setCurrent !== false; // default true
    version = normalizeVersionToTag(version);

    if (!hotelId || !categoryId || !categoryId.includes("/")) {
        return NextResponse.json({ error: "hotelId y categoryId requeridos" }, { status: 400 });
    }
    const [category, promptKey] = categoryId.split("/");

    // 1) Traer template (DB o fallback a seed local)
    const db = await getAstraDB();
    const regCol = db.collection("category_registry");
    let template: { title?: string; body?: string } | null = null;
    try {
        const doc: any = await regCol.findOne({ categoryId });
        if (doc?.templates) {
            const tpl = typeof doc.templates === "string" ? JSON.parse(doc.templates) : doc.templates;
            template = tpl?.[lang] ?? null;
        }
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (!/Collection does not exist/i.test(msg)) {
            return NextResponse.json({ error: msg }, { status: 500 });
        }
        const client = getCassandraClient();
        const rs = await client.execute(
            `SELECT templates FROM "${process.env.ASTRA_DB_KEYSPACE}"."category_registry" WHERE "categoryId"=? LIMIT 1`,
            [categoryId],
            { prepare: true }
        );
        const row = rs.first();
        if (row) {
            let templates: any = row.get("templates");
            if (typeof templates === "string") {
                try { templates = JSON.parse(templates); } catch { }
            }
            template = templates?.[lang] ?? null;
        }
    }

    if (!template) {
        // Fallback seed local
        try {
            const fs = await import("fs");
            const path = await import("path");
            const file = path.resolve(process.cwd(), "seeds/category_registry.json");
            if (fs.existsSync(file)) {
                const raw = fs.readFileSync(file, "utf8");
                const list = JSON.parse(raw) as Array<any>;
                const entry = list.find((x) => x?.categoryId === categoryId);
                const tpl = entry?.templates?.[lang];
                if (tpl) template = tpl;
            }
        } catch {
            // ignore
        }
    }

    if (!template || (!template.body && !template.title)) {
        return NextResponse.json({ error: `No hay template para ${categoryId} (${lang})` }, { status: 404 });
    }

    // 2) Cargar hotel_config y enriquecer
    const cfg = await safeGetHotelConfig(hotelId);
    const cfg2 = enrichConfigForHydration(cfg, categoryId);

    // 3) Hidratar contenido
    const hydrated = hydrateContent({ title: template.title || null, body: template.body || null }, cfg2, categoryId, lang);
    const hTitle = hydrated?.content.title || template.title || extractTitle(template.body) || undefined;
    const hBody = hydrated?.content.body || template.body || undefined;

    if (!hBody) {
        return NextResponse.json({ error: "No hay body para persistir" }, { status: 400 });
    }

    // 4) Persistir en hotel_content
    const record: HotelContent = {
        hotelId,
        category,
        promptKey,
        lang,
        version,
        type: inferType(category, promptKey),
        title: hTitle,
        body: hBody,
    };
    const up = await upsertHotelContent(record);

    if (setCurrent) {
        await setCurrentVersionInIndex({
            hotelId,
            category,
            promptKey,
            lang,
            currentVersion: version,
        });
    }

    return NextResponse.json({ ok: true, hotelContentId: up.id, version: up.versionTag || version });
}

// --- Hydration helpers (copiados para evitar dependencia circular) ---
type Content = { title: string | null; body: string | null };

async function safeGetHotelConfig(hotelId: string) {
    try {
        return await getHotelConfig(hotelId);
    } catch {
        return null;
    }
}

// Derivar otros canales si no están explícitos; soporta array o string legacy.
function deriveOtherChannelsArray(cfg: any): string[] | undefined {
    if (!cfg) return undefined;
    const existing = cfg?.contacts?.otherChannels;
    if (Array.isArray(existing) && existing.length > 0) return existing;
    if (typeof existing === 'string' && existing.trim()) {
        return existing.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    }
    const socialCandidates: Array<{ key: string; label: string }> = [
        { key: 'instagram', label: 'Instagram' },
        { key: 'facebook', label: 'Facebook' },
        { key: 'telegram', label: 'Telegram' },
        { key: 'messenger', label: 'Messenger' },
        { key: 'twitter', label: 'Twitter' },
        { key: 'tiktok', label: 'TikTok' },
    ];
    const cc = cfg?.channelConfigs || {};
    const derived = socialCandidates.filter(c => cc?.[c.key]?.enabled === true).map(c => c.label);
    return derived.length ? derived : undefined;
}

function enrichConfigForHydration(cfg: any, categoryId: string): any {
    if (!cfg) return cfg;
    if (categoryId !== 'support/contact_support') return cfg;
    const clone = JSON.parse(JSON.stringify(cfg));
    const derived = deriveOtherChannelsArray(clone);
    if (derived && (!Array.isArray(clone.contacts?.otherChannels) || clone.contacts.otherChannels.length === 0)) {
        clone.contacts = clone.contacts || {};
        clone.contacts.otherChannels = derived;
    }
    return clone;
}

function getIn(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
        if (cur && typeof cur === "object" && p in cur) {
            cur = (cur as any)[p];
        } else {
            return undefined;
        }
    }
    return cur;
}

function replaceTokenSyntax(text: string, cfg: any): { out: string; used: Record<string, any> } {
    const used: Record<string, any> = {};
    if (!text) return { out: text, used };
    const re = /\[\[([^\]]+)\]\]/g;
    const out = text.replace(re, (m, inner) => {
        const innerTrim = String(inner).trim();
        if (innerTrim.toLowerCase().startsWith("each:") || innerTrim.toLowerCase().startsWith("join:")) {
            return m;
        }
        const parts = String(inner).split("|").map((s: string) => s.trim());
        let keyPath = "";
        let def: string | undefined;
        for (const p of parts) {
            const km = p.match(/^key\s*:\s*(.+)$/i);
            if (km) { keyPath = km[1].trim(); continue; }
            const dm = p.match(/^default\s*:\s*(.+)$/i);
            if (dm) { def = dm[1].trim(); continue; }
        }
        if (!keyPath && parts.length === 1) {
            keyPath = parts[0];
        }
        const val = keyPath ? getIn(cfg, keyPath) : undefined;
        if (val == null || val === "") return def != null ? String(def) : m;
        used[keyPath] = val;
        return String(val);
    });
    return { out, used };
}

function hydrateContent(content: Content, cfg: any, categoryId: string, lang: string): { content: Content; meta: any } | null {
    if (!content) return null;
    const meta: any = { used: {}, strategy: [] as string[] };
    let title = content.title || "";
    let body = content.body || "";
    if (cfg) {
        const eTitle = expandIterators(title, cfg, meta);
        if (eTitle !== title) meta.strategy.push("iterator");
        title = eTitle;
        const eBody = expandIterators(body, cfg, meta);
        if (eBody !== body) meta.strategy.push("iterator");
        body = eBody;

        const t1 = replaceTokenSyntax(title, cfg);
        const b1 = replaceTokenSyntax(body, cfg);
        meta.used = { ...meta.used, ...t1.used, ...b1.used };
        if (t1.out !== title) meta.strategy.push("token-key");
        if (b1.out !== body) meta.strategy.push("token-key");
        title = t1.out; body = b1.out;
    }
    return { content: { title, body }, meta };
}

function expandIterators(text: string, rootCfg: any, meta: any): string {
    if (!text) return text;
    // Mantener mismo orden que /get: primero EACH, luego JOINs de nivel superior.
    let out = parseEachTokens(text, rootCfg, meta);
    out = expandJoins(out, rootCfg);
    return out;
}

function parseEachTokens(text: string, rootCfg: any, meta: any): string {
    let result = text;
    let changed = true;

    while (changed) {
        changed = false;
        const eachStart = result.indexOf('[[each:');
        if (eachStart === -1) break;
        const arrowIndex = result.indexOf('->', eachStart);
        if (arrowIndex === -1) break;
        const pathAndOptions = result.substring(eachStart + 7, arrowIndex).trim();
        let bracketCount = 1;
        let endIndex = arrowIndex + 2;
        while (endIndex < result.length && bracketCount > 0) {
            if (result.substring(endIndex, endIndex + 2) === '[[') { bracketCount++; endIndex += 2; }
            else if (result.substring(endIndex, endIndex + 2) === ']]') { bracketCount--; endIndex += 2; }
            else { endIndex++; }
        }
        if (bracketCount > 0) { break; }
        const template = result.substring(arrowIndex + 2, endIndex - 2);
        const fullMatch = result.substring(eachStart, endIndex);
        const { path, options } = parsePathAndOptions(pathAndOptions);
        const arr = getIn(rootCfg, path);
        const defaultBlock = options.default || "";
        let replacement = "";
        if (!Array.isArray(arr) || arr.length === 0) {
            replacement = defaultBlock;
        } else {
            const rendered = arr.map((item: any) => {
                let itemOutput = template;
                itemOutput = expandJoins(itemOutput, item);
                const tokenRe = /\[\[([^\]]+)\]\]/g;
                itemOutput = itemOutput.replace(tokenRe, (tokenMatch: string, inner: string) => {
                    const segments = inner.split("|").map((s: string) => s.trim());
                    let fieldPath = "";
                    let fieldDefault: string | undefined;
                    if (!segments.some(s => s.includes(":"))) {
                        fieldPath = segments[0];
                        fieldDefault = segments[1];
                    } else {
                        for (const segment of segments) {
                            const keyMatch = segment.match(/^key\s*:\s*(.+)$/i);
                            if (keyMatch) { fieldPath = keyMatch[1].trim(); continue; }
                            const defaultMatch = segment.match(/^default\s*:\s*(.+)$/i);
                            if (defaultMatch) { fieldDefault = defaultMatch[1].trim(); continue; }
                            if (!segment.includes(":") && !fieldPath) { fieldPath = segment; }
                        }
                    }
                    if (!fieldPath) return tokenMatch;
                    const value = getIn(item, fieldPath);
                    if (value == null || value === "") { return fieldDefault != null ? fieldDefault : tokenMatch; }
                    if (Array.isArray(value)) { return value.join(", "); }
                    return String(value);
                });
                return itemOutput;
            });
            replacement = rendered.join("\n");
        }
        result = result.replace(fullMatch, replacement);
        changed = true;
    }
    return result;
}

function coerceToArray(val: any): any[] | undefined {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        const parts = val.split(/[;,\n]/).map(s => s.trim()).filter(Boolean);
        return parts.length ? parts : undefined;
    }
    return undefined;
}

function expandJoins(fragment: string, item: any): string {
    if (!fragment.includes('[[join:')) return fragment;
    let out = fragment;
    let idx = out.indexOf('[[join:');
    while (idx !== -1) {
        const arrow = out.indexOf('->', idx);
        if (arrow === -1) break;
        const header = out.substring(idx + 7, arrow).trim();
        let bracketCount = 1;
        let scan = arrow + 2;
        while (scan < out.length && bracketCount > 0) {
            const two = out.substring(scan, scan + 2);
            if (two === '[[') { bracketCount++; scan += 2; continue; }
            if (two === ']]') { bracketCount--; scan += 2; continue; }
            scan++;
        }
        if (bracketCount > 0) break;
        const full = out.substring(idx, scan);
        const template = out.substring(arrow + 2, scan - 2);
        const { path: joinPath, options } = parsePathAndOptions(header);
        const raw = getIn(item, joinPath);
        const arr = coerceToArray(raw);
        const sep = options.sep ? String(options.sep).replace(/\\n/g, '\n') : '\n';
        const def = options.default || '';
        let replacement: string;
        if (!Array.isArray(arr) || arr.length === 0) {
            replacement = def;
        } else {
            replacement = arr.map((val: any) => {
                const url = String(val);
                if (template.includes('!img(')) {
                    const alt = String((item && (item as any).name) ? (item as any).name : 'image');
                    return template.replace(/!img\(\s*\[\[item\]\]\s*\)/g, `![${alt}](${url})`);
                }
                return template.replace(/\[\[item\]\]/g, url);
            }).join(sep);
        }
        out = out.replace(full, replacement);
        idx = out.indexOf('[[join:');
    }
    return out;
}

function parsePathAndOptions(raw: string): { path: string; options: Record<string, string> } {
    const parts = raw.split("|").map(p => p.trim());
    const path = parts.shift() || "";
    const options: Record<string, string> = {};
    for (const p of parts) {
        const m = p.match(/^(default|sep):\s*(.+)$/i);
        if (m) options[m[1].toLowerCase()] = m[2];
    }
    return { path, options };
}
