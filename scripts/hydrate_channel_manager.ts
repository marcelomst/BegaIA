#!/usr/bin/env tsx
/**
 * Hydrate support/channel_manager from seeds using a provided config JSON (inline or @path).
 * Run with:
 *   pnpm exec tsx scripts/hydrate_channel_manager.ts --lang es --config '{"channelConfigs":{"channelManager":{"enabled":true,"username":"recepcion","lastSync":"2025-11-10 13:00","provider":"Beds24"}}}'
 *   pnpm exec tsx scripts/hydrate_channel_manager.ts --lang pt --config @/path/to/config.json
 */

import { readFileSync } from "node:fs";
import * as path from "node:path";

const CATEGORY_ID = "support/channel_manager" as const;

function getIn(obj: any, p: string): any {
    if (!obj || !p) return undefined;
    const parts = String(p).split(".");
    let cur: any = obj;
    for (const k of parts) {
        if (cur && typeof cur === "object" && k in cur) {
            cur = cur[k];
        } else {
            return undefined;
        }
    }
    return cur;
}

function replaceTokenSyntax(text: string, cfg: any): string {
    if (!text) return text;
    const re = /\[\[([^\]]+)\]\]/g;
    return text.replace(re, (m, inner) => {
        const innerTrim = String(inner).trim();
        if (innerTrim.toLowerCase().startsWith("each:") || innerTrim.toLowerCase().startsWith("join:")) {
            return m;
        }
        const parts = String(inner).split("|").map((s) => s.trim());
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
        return String(val);
    });
}

function pickTemplate(templates: any, lang: string): { lang: string; tpl: any; available: string[] } | null {
    if (!templates || typeof templates !== "object") return null;
    const keys = Object.keys(templates);
    const preferred = Array.from(new Set([lang, lang.toLowerCase?.(), "es", "en", "pt", ...keys].filter(Boolean) as string[]));
    const chosen = preferred.find((k) => templates[k]);
    if (!chosen) return null;
    return { lang: chosen, tpl: templates[chosen], available: keys };
}

function loadSeedCategory(categoryId: string) {
    const file = path.resolve(process.cwd(), "seeds/category_registry.json");
    const raw = readFileSync(file, "utf8");
    const list = JSON.parse(raw) as Array<any>;
    return list.find((x) => x && x.categoryId === categoryId) || null;
}

function parseArgs(argv: string[]) {
    const out: any = { lang: "es", config: undefined };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--lang" && argv[i + 1]) { out.lang = String(argv[++i]); continue; }
        if (a === "--config" && argv[i + 1]) { out.config = String(argv[++i]); continue; }
        if (!out._pos) out._pos = [];
        out._pos.push(a);
    }
    if (out._pos?.[0] && !out.lang) out.lang = out._pos[0];
    if (out._pos?.[1] && !out.config) out.config = out._pos[1];
    return out;
}

function parseConfigArg(arg?: string) {
    if (!arg) return null;
    if (arg.startsWith("@")) {
        const p = arg.slice(1);
        const raw = readFileSync(p, "utf8");
        return JSON.parse(raw);
    }
    try { return JSON.parse(arg); } catch { return null; }
}

async function main() {
    const { lang, config } = parseArgs(process.argv);
    const cfg = parseConfigArg(config) || {
        channelConfigs: {
            channelManager: {
                enabled: true,
                username: "recepcion",
                lastSync: "2025-11-10 13:00",
                provider: "Beds24",
            },
        },
    };

    const entry = loadSeedCategory(CATEGORY_ID);
    if (!entry) {
        console.error("Category not found in seeds:", CATEGORY_ID);
        process.exit(1);
    }
    const pick = pickTemplate(entry.templates || {}, String(lang || "es").toLowerCase());
    if (!pick) {
        console.error("Template lang not found. Available:", Object.keys(entry.templates || {}));
        process.exit(1);
    }

    const title = replaceTokenSyntax(pick.tpl.title || "", cfg);
    const body = replaceTokenSyntax(pick.tpl.body || "", cfg);

    const out = `# Hydrated: ${CATEGORY_ID} [${pick.lang}]\n\nTitle:\n${title}\n\nBody:\n${body}\n`;
    process.stdout.write(out);
}

main().catch((err) => { console.error(err); process.exit(1); });
