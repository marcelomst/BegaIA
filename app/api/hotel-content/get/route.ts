import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAstraDB, getCassandraClient } from "@/lib/astra/connection";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getCurrentVersionFromIndex } from "@/lib/astra/hotelVersionIndex";
import { normalizeVersionToTag } from "@/lib/astra/hotelContent";
import { verifyJWT } from "@/lib/auth/jwt";

function normalize(v: string | null | undefined) {
    return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

export async function GET(req: NextRequest) {
    // Auth: header x-admin-key o cookie (panel)
    const search = new URL(req.url).searchParams;
    const hdrKey = normalize(req.headers.get("x-admin-key"));
    const qpKey = normalize(search.get("x-admin-key") || search.get("admin_key") || search.get("adminKey"));
    const providedKey = hdrKey || qpKey;
    const envKey = normalize(process.env.ADMIN_API_KEY);
    const headerAuthOk = !!envKey && providedKey === envKey;

    let cookieAuthOk = false;
    let jwtPayload: any = null;
    const token = req.cookies.get("token")?.value;
    if (token) {
        jwtPayload = await verifyJWT(token);
        cookieAuthOk = !!jwtPayload;
    }
    if (!headerAuthOk && !cookieAuthOk) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hotelId = normalize(search.get("hotelId"));
    const rawCategoryId = normalize(search.get("categoryId"));
    const lang = normalize(search.get("lang") || "es").toLowerCase();
    const versionRaw = normalize(search.get("version") || "");

    if (!hotelId || !rawCategoryId || !rawCategoryId.includes("/")) {
        return NextResponse.json({ error: "hotelId y categoryId requeridos" }, { status: 400 });
    }
    const [category, promptKey] = rawCategoryId.split("/");

    const db = await getAstraDB();
    const col = db.collection("hotel_content");
    const regCol = db.collection("category_registry");

    // Determinar visibilidad solicitante: staff (técnicos, managers, recepción) vs invitados
    // Regla: recepción (roleLevel 20) y superiores pueden ver "internal"; invitados (>=30) no.
    const roleLevel = Number(jwtPayload?.roleLevel ?? NaN);
    const isStaff = headerAuthOk || (cookieAuthOk && Number.isFinite(roleLevel) && roleLevel < 30);

    async function getCategoryAudience(): Promise<string | undefined> {
        try {
            const reg = await regCol.findOne({ categoryId: `${category}/${promptKey}` });
            if (reg && typeof reg.audience === "string") return reg.audience as string;
        } catch {
            // ignore and fallback to seeds
        }
        try {
            const fs = await import("fs");
            const path = await import("path");
            const file = path.resolve(process.cwd(), "seeds/category_registry.json");
            if (fs.existsSync(file)) {
                const raw = fs.readFileSync(file, "utf8");
                const list = JSON.parse(raw) as Array<any>;
                const entry = list.find((x) => x?.categoryId === `${category}/${promptKey}`);
                if (entry && typeof entry.audience === "string") return entry.audience as string;
            }
        } catch {
            // ignore
        }
        return undefined;
    }

    function isAudienceAllowed(audience?: string): boolean {
        if (!audience) return true; // por defecto pública
        if (audience === "internal") return !!isStaff;
        // futuros: "staff" / "private" etc.
        return true;
    }

    async function tryGetHotelContentDoc() {
        try {
            // Resolver versión
            let versionTag: string | undefined;
            if (versionRaw) {
                versionTag = normalizeVersionToTag(versionRaw);
            } else {
                try {
                    const idx = await getCurrentVersionFromIndex(hotelId, category, promptKey, lang);
                    if (idx?.currentVersion) {
                        versionTag = normalizeVersionToTag(idx.currentVersion as any);
                    }
                } catch (_) { /* ignore index errors, fallback to scan */ }
            }

            if (versionTag) {
                const doc = await col.findOne({ hotelId, category, promptKey, lang, version: versionTag });
                if (doc) return { doc, versionTag } as const;
            }

            // Sin versión o no encontrada → agarrar la mayor por versionNumber/versionTag
            const all = await col.find({ hotelId, category, promptKey, lang }).toArray();
            if (all && all.length) {
                const best = all.reduce((acc: any, cur: any) => {
                    const a = (acc?.versionNumber ?? parseInt(String(acc?.versionTag || "").replace(/^v/i, ""), 10)) || 0;
                    const b = (cur?.versionNumber ?? parseInt(String(cur?.versionTag || "").replace(/^v/i, ""), 10)) || 0;
                    return b > a ? cur : acc;
                });
                if (best) return { doc: best, versionTag: best.versionTag || best.version } as const;
            }
            return null;
        } catch (e: any) {
            const msg = String(e?.message || e);
            if (!/Collection does not exist/i.test(msg)) throw e;

            // Fallback CQL
            const client = getCassandraClient();
            if (versionRaw) {
                const v = normalizeVersionToTag(versionRaw);
                const rs = await client.execute(
                    `SELECT title, body, version FROM "${process.env.ASTRA_DB_KEYSPACE}"."hotel_content" 
           WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=? AND version=? LIMIT 1`,
                    [hotelId, category, promptKey, lang, v],
                    { prepare: true }
                );
                const row = rs.first();
                if (row) return { doc: { title: row.get("title"), body: row.get("body"), version: row.get("version") }, versionTag: row.get("version") } as const;
            }
            // sin versión → traer el último según versión textual (heurística)
            const rs2 = await client.execute(
                `SELECT title, body, version FROM "${process.env.ASTRA_DB_KEYSPACE}"."hotel_content" 
         WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=?`,
                [hotelId, category, promptKey, lang],
                { prepare: true }
            );
            const rows = rs2.rows || [];
            if (rows.length) {
                const best = rows.reduce((acc, cur) => {
                    const a = parseInt(String(acc.get("version") || "").replace(/^v/i, ""), 10) || 0;
                    const b = parseInt(String(cur.get("version") || "").replace(/^v/i, ""), 10) || 0;
                    return b > a ? cur : acc;
                });
                if (best) return { doc: { title: best.get("title"), body: best.get("body"), version: best.get("version") }, versionTag: best.get("version") } as const;
            }
            return null;
        }
    }

    // 1) Intentar hotel_content
    const hotelRes = await tryGetHotelContentDoc();
    const audience = await getCategoryAudience();
    if (!isAudienceAllowed(audience)) {
        return NextResponse.json({ error: "Forbidden (audience)" }, { status: 403 });
    }
    if (hotelRes?.doc) {
        const d: any = hotelRes.doc;
        // Hydratar con hotel_config
        const cfg = await safeGetHotelConfig(hotelId);
        const cfg2 = enrichConfigForHydration(cfg, `${category}/${promptKey}`);
        const hydrated = hydrateContent({ title: d.title || null, body: d.body || null }, cfg2, `${category}/${promptKey}`, lang);

        // Obtener plantilla seed para validación
        let seedTemplate: string | undefined = undefined;
        try {
            const fs = await import("fs");
            const path = await import("path");
            const file = path.resolve(process.cwd(), "seeds/category_registry.json");
            if (fs.existsSync(file)) {
                const raw = fs.readFileSync(file, "utf8");
                const list = JSON.parse(raw);
                const entry = list.find((x: any) => x?.categoryId === `${category}/${promptKey}`);
                if (entry && entry.templates && entry.templates[lang] && entry.templates[lang].body) {
                    seedTemplate = entry.templates[lang].body;
                }
            }
        } catch { }

        // Validar plantilla actual
        let validation = null;
        try {
            const { validateKbTemplate } = await import("@/lib/kb/validateKbTemplate");
            validation = await validateKbTemplate({
                hotelConfig: cfg,
                template: d.body || "",
                seedTemplate,
            });
        } catch { }

        return NextResponse.json({
            ok: true,
            source: "hotel",
            hotelId,
            categoryId: `${category}/${promptKey}`,
            lang,
            version: hotelRes.versionTag,
            content: { title: d.title || null, body: d.body || null },
            hydrated: hydrated?.content || null,
            hydrationMeta: hydrated?.meta || null,
            isFallback: false,
            validation,
        });
    }

    // 2) Fallback a category_registry
    try {
        const reg: any = await regCol.findOne({ categoryId: `${category}/${promptKey}` });
        let templates: any = reg?.templates || {};
        if (typeof templates === "string") {
            try { templates = JSON.parse(templates); } catch { }
        }
        if (!isAudienceAllowed(reg?.audience)) {
            return NextResponse.json({ error: "Forbidden (audience)" }, { status: 403 });
        }
        const picked = pickTemplate(templates, lang);
        if (picked) {
            // Hydratar con hotel_config
            const cfg = await safeGetHotelConfig(hotelId);
            const cfg2 = enrichConfigForHydration(cfg, `${category}/${promptKey}`);
            const hydrated = hydrateContent({ title: picked.tpl?.title || null, body: picked.tpl?.body || null }, cfg2, `${category}/${promptKey}`, picked.lang);
            return NextResponse.json({
                ok: true,
                source: "registry",
                hotelId,
                categoryId: `${category}/${promptKey}`,
                lang: picked.lang,
                version: null,
                content: { title: picked.tpl?.title || null, body: picked.tpl?.body || null },
                hydrated: hydrated?.content || null,
                hydrationMeta: hydrated?.meta || null,
                isFallback: true,
                availableTemplateLangs: picked.availableLangs,
            });
        }
        // Si no hay entry en DB, caer al seed local
        return await localSeedFallback({ hotelId, category, promptKey, lang });
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (!/Collection does not exist/i.test(msg)) {
            return NextResponse.json({ error: msg }, { status: 500 });
        }
        // CQL fallback
        const client = getCassandraClient();
        const rs = await client.execute(
            `SELECT templates FROM "${process.env.ASTRA_DB_KEYSPACE}"."category_registry" WHERE "categoryId"=? LIMIT 1`,
            [`${category}/${promptKey}`],
            { prepare: true }
        );
        const row = rs.first();
        let templates: any = row?.get("templates") || {};
        if (typeof templates === "string") {
            try { templates = JSON.parse(templates); } catch { }
        }
        if (!isAudienceAllowed(undefined)) {
            return NextResponse.json({ error: "Forbidden (audience)" }, { status: 403 });
        }
        const picked = pickTemplate(templates, lang);
        if (picked) {
            const cfg = await safeGetHotelConfig(hotelId);
            const cfg2 = enrichConfigForHydration(cfg, `${category}/${promptKey}`);
            const hydrated = hydrateContent({ title: picked.tpl?.title || null, body: picked.tpl?.body || null }, cfg2, `${category}/${promptKey}`, picked.lang);
            return NextResponse.json({
                ok: true,
                source: "registry",
                hotelId,
                categoryId: `${category}/${promptKey}`,
                lang: picked.lang,
                version: null,
                content: { title: picked.tpl?.title || null, body: picked.tpl?.body || null },
                hydrated: hydrated?.content || null,
                hydrationMeta: hydrated?.meta || null,
                isFallback: true,
                availableTemplateLangs: picked.availableLangs,
            });
        }
        // Sin resultados en DB/CQL → seed local
        return await localSeedFallback({ hotelId, category, promptKey, lang });
    }
}

function pickTemplate(templates: any, requestedLang: string): { lang: string; tpl: any; availableLangs: string[] } | null {
    if (!templates) return null;
    if (typeof templates === "string") {
        try { templates = JSON.parse(templates); } catch { return null; }
    }
    if (Array.isArray(templates)) return null; // inválido: esperamos objeto por idioma
    if (typeof templates !== "object") return null;

    // Filtrar sólo claves plausibles de idioma (es, en, pt, es-AR, en-US, etc.) y valores objeto
    const allKeys = Object.keys(templates || {});
    const langKeyRe = /^[a-z]{2}(?:-[A-Z]{2})?$/;
    const validKeys = allKeys.filter((k) => langKeyRe.test(k) && templates[k] && typeof templates[k] === "object");
    if (validKeys.length === 0) return null;

    const preferredOrder = Array.from(new Set([requestedLang, requestedLang.toLowerCase(), "es", "en", "pt", ...validKeys]));
    const chosen = preferredOrder.find((k) => validKeys.includes(k));
    if (!chosen) return null;
    return { lang: chosen, tpl: templates[chosen], availableLangs: validKeys };
}

async function localSeedFallback(args: { hotelId: string; category: string; promptKey: string; lang: string }) {
    const { hotelId, category, promptKey, lang } = args;
    try {
        const fs = await import("fs");
        const path = await import("path");
        const file = path.resolve(process.cwd(), "seeds/category_registry.json");
        if (!fs.existsSync(file)) {
            return NextResponse.json({ ok: true, source: "seed", hotelId, categoryId: `${category}/${promptKey}`, lang, version: null, content: { title: null, body: null }, isFallback: true, availableTemplateLangs: [] });
        }
        const raw = fs.readFileSync(file, "utf8");
        const list = JSON.parse(raw) as Array<any>;
        const entry = list.find((x) => x?.categoryId === `${category}/${promptKey}`);
        const templates = entry?.templates || {};
        const preferred = [lang, "es", "en", ...(Object.keys(templates || {}) as string[])];
        const chosen = preferred.find((l) => templates?.[l]);
        const tpl = chosen ? templates[chosen] : null;
        // Hydratar con hotel_config
        const cfg = await safeGetHotelConfig(hotelId);
        const cfg2 = enrichConfigForHydration(cfg, `${category}/${promptKey}`);
        const hydrated = hydrateContent({ title: tpl?.title || null, body: tpl?.body || null }, cfg2, `${category}/${promptKey}`, chosen || lang);
        return NextResponse.json({
            ok: true,
            source: "seed",
            hotelId,
            categoryId: `${category}/${promptKey}`,
            lang: chosen || lang,
            version: null,
            content: { title: tpl?.title || null, body: tpl?.body || null },
            hydrated: hydrated?.content || null,
            hydrationMeta: hydrated?.meta || null,
            isFallback: true,
            availableTemplateLangs: Object.keys(templates || {}),
        });
    } catch {
        return NextResponse.json({ ok: true, source: "seed", hotelId, categoryId: `${category}/${promptKey}`, lang, version: null, content: { title: null, body: null }, hydrated: null, hydrationMeta: null, isFallback: true, availableTemplateLangs: [] });
    }
}

// --- Hydration helpers ---
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
        return existing.split(/[,;]/).map(s => s.trim()).filter(Boolean);
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
    // Sintaxis soportada:
    // [[key: path.to.value | default: Fallback text]]
    // [[path.to.value]] (alias simple)
    const re = /\[\[([^\]]+)\]\]/g;
    const out = text.replace(re, (m, inner) => {
        const innerTrim = String(inner).trim();
        // No procesar iteradores en esta fase
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
            // alias simple: [[a.b.c]]
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
        // Primero, expandimos iteradores (each/join) para no romper su sintaxis con el reemplazo simple
        const eTitle = expandIterators(title, cfg, meta);
        if (eTitle !== title) meta.strategy.push("iterator");
        title = eTitle;
        const eBody = expandIterators(body, cfg, meta);
        if (eBody !== body) meta.strategy.push("iterator");
        body = eBody;

        // Luego, reemplazos por sintaxis de claves restantes
        const t1 = replaceTokenSyntax(title, cfg);
        const b1 = replaceTokenSyntax(body, cfg);
        meta.used = { ...meta.used, ...t1.used, ...b1.used };
        if (t1.out !== title) meta.strategy.push("token-key");
        if (b1.out !== body) meta.strategy.push("token-key");
        title = t1.out; body = b1.out;
    }
    return { content: { title, body }, meta };
}

// --- Iterators (each, join) ---
function expandIterators(text: string, rootCfg: any, meta: any): string {
    if (!text) return text;
    // Procesar primero EACH; dentro de cada item se expanden JOINs anidados.
    // Evitamos expandir JOINs a nivel raíz para no consumir los que están dentro de bloques EACH.
    let out = parseEachTokens(text, rootCfg, meta);
    // Finalmente expandir JOINs verdaderamente de nivel superior (si existieran fuera de EACH).
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

        // Encontrar el -> después de each:
        const arrowIndex = result.indexOf('->', eachStart);
        if (arrowIndex === -1) break;

        const pathAndOptions = result.substring(eachStart + 7, arrowIndex).trim();

        // Encontrar el cierre balanceado ]]
        let bracketCount = 1;
        let endIndex = arrowIndex + 2;

        while (endIndex < result.length && bracketCount > 0) {
            if (result.substring(endIndex, endIndex + 2) === '[[') {
                bracketCount++;
                endIndex += 2;
            } else if (result.substring(endIndex, endIndex + 2) === ']]') {
                bracketCount--;
                endIndex += 2;
            } else {
                endIndex++;
            }
        }

        if (bracketCount > 0) {
            // No encontramos cierre balanceado, salir
            break;
        }

        const template = result.substring(arrowIndex + 2, endIndex - 2);
        const fullMatch = result.substring(eachStart, endIndex);

        const { path, options } = parsePathAndOptions(pathAndOptions);
        const arr = getIn(rootCfg, path);
        const defaultBlock = options.default || "";

        let replacement = "";
        if (!Array.isArray(arr) || arr.length === 0) {
            replacement = defaultBlock;
        } else {
            // Renderizar cada item del array
            const rendered = arr.map(item => {
                let itemOutput = template;

                // 1) Procesar join anidados primero para evitar que el tokenRe rompa su sintaxis
                itemOutput = expandJoins(itemOutput, item);

                // 2) Procesar tokens simples [[campo]] y [[key: campo | default: ...]]
                const tokenRe = /\[\[([^\]]+)\]\]/g;
                itemOutput = itemOutput.replace(tokenRe, (tokenMatch: string, inner: string) => {
                    const segments = inner.split("|").map((s: string) => s.trim());
                    let fieldPath = "";
                    let fieldDefault: string | undefined;

                    // Si no hay segmentos con ":", es un path directo
                    if (!segments.some(s => s.includes(":"))) {
                        fieldPath = segments[0];
                        fieldDefault = segments[1]; // Si hay un segundo segmento, es default
                    } else {
                        // Procesar segmentos con formato key:value
                        for (const segment of segments) {
                            const keyMatch = segment.match(/^key\s*:\s*(.+)$/i);
                            if (keyMatch) {
                                fieldPath = keyMatch[1].trim();
                                continue;
                            }
                            const defaultMatch = segment.match(/^default\s*:\s*(.+)$/i);
                            if (defaultMatch) {
                                fieldDefault = defaultMatch[1].trim();
                                continue;
                            }
                            // Si no tiene prefijo, asumir que es el path
                            if (!segment.includes(":") && !fieldPath) {
                                fieldPath = segment;
                            }
                        }
                    }

                    if (!fieldPath) return tokenMatch;

                    const value = getIn(item, fieldPath);
                    if (value == null || value === "") {
                        return fieldDefault != null ? fieldDefault : tokenMatch;
                    }

                    meta.used[fieldPath] = value;
                    if (Array.isArray(value)) {
                        return value.join(", ");
                    }
                    return String(value);
                });

                return itemOutput;
            });

            replacement = rendered.join("\n");
        }

        // Reemplazar el token completo con el resultado renderizado
        result = result.replace(fullMatch, replacement);
        changed = true;
    }

    return result;
}

function coerceToArray(val: any): any[] | undefined {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        const parts = val
            .split(/[;,\n]/)
            .map((s) => s.trim())
            .filter(Boolean);
        return parts.length ? parts : undefined;
    }
    return undefined;
}

// Expande bloques [[join: path | sep: X | default: Y -> TEMPLATE]] dentro de un fragmento
function expandJoins(fragment: string, item: any): string {
    if (!fragment.includes('[[join:')) return fragment;
    let out = fragment;
    let idx = out.indexOf('[[join:');
    while (idx !== -1) {
        // Encontrar '->'
        const arrow = out.indexOf('->', idx);
        if (arrow === -1) break; // sintaxis incompleta
        const header = out.substring(idx + 7, arrow).trim(); // tras '[[join:'
        // Buscar cierre balanceado para este bloque
        let bracketCount = 1; // ya contamos el '[[' inicial
        let scan = arrow + 2; // empezar tras '->'
        while (scan < out.length && bracketCount > 0) {
            if (out.substring(scan, scan + 2) === '[[') { bracketCount++; scan += 2; continue; }
            if (out.substring(scan, scan + 2) === ']]') { bracketCount--; scan += 2; continue; }
            scan++;
        }
        if (bracketCount > 0) break; // no cerrado
        const full = out.substring(idx, scan);
        const template = out.substring(arrow + 2, scan - 2); // sin ']]'
        const { path: joinPath, options } = parsePathAndOptions(header);
        const raw = getIn(item, joinPath);
        const arr = coerceToArray(raw);
        const sep = options.sep ? String(options.sep).replace(/\\n/g, '\n') : '\n';
        const def = options.default || '';
        let replacement: string;
        if (!Array.isArray(arr) || arr.length === 0) {
            replacement = def;
        } else {
            replacement = arr.map(val => {
                const url = String(val);
                // Soporte sintaxis abreviada: !img([[item]]) -> ![alt](url) con alt desde item.name si existe
                if (template.includes('!img(')) {
                    const alt = String((item && item.name) ? item.name : 'image');
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
    // raw puede contener "rooms | default: ... | sep: ..." antes del -> (ya extraído)
    const parts = raw.split("|").map(p => p.trim());
    const path = parts.shift() || "";
    const options: Record<string, string> = {};
    for (const p of parts) {
        const m = p.match(/^(default|sep):\s*(.+)$/i);
        if (m) options[m[1].toLowerCase()] = m[2];
    }
    return { path, options };
}
