// Path: /root/begasist/lib/kb/templateHydrator.ts

import type { HydratedTemplate, GlobalHydrationContext } from "@/types/kb";

/**
 * Hidrata un machineBody lleno de tokens [[key: ...]]
 * usando KnowledgeState + defaults.
 *
 * Regla:
 * - Si existe ctx.knowledge.values[key] y no es vacío → usar ese valor.
 * - Si no existe o está vacío → usar el default del token.
 * - missingKeys incluye todas las keys para las que no había valor real.
 */
export function hydrateTemplateGlobal(
    machineBody: string,
    ctx: GlobalHydrationContext
): HydratedTemplate {
    const missing: string[] = [];

    const text = machineBody.replace(
        /\[\[key:\s*([a-z0-9._-]+)\s*\|\s*default:\s*([^\]]+?)\]\]/gi,
        (_full, key: string, rawDefault: string) => {
            const trimmedKey = String(key).trim();
            const defaultValue = String(rawDefault).trim();
            const stored = ctx.knowledge.values[trimmedKey];
            const value = stored && stored.length ? stored : defaultValue;

            if (!stored || !stored.length) {
                missing.push(trimmedKey);
            }

            return value;
        }
    );

    return {
        text,
        missingKeys: Array.from(new Set(missing)),
    };
}
