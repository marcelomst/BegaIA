// Helper para validación de plantillas KB: tokens, each, join, diferencias vs seed
import fs from "fs";
import path from "path";
import { listRuntimeKeys } from "@/lib/kb/runtimeContextSchema";

type KeyRef = { path: string; hasKeyPrefix: boolean };
type ContextualKeyRef = { collectionPath: string; path: string };
type EachBlock = { path: string; body: string; start: number; end: number };

function findEachBlocks(template: string): EachBlock[] {
    const blocks: EachBlock[] = [];
    if (!template) return blocks;
    let searchFrom = 0;
    while (searchFrom < template.length) {
        const eachStart = template.indexOf("[[each:", searchFrom);
        if (eachStart === -1) break;
        const arrowIndex = template.indexOf("->", eachStart);
        if (arrowIndex === -1) break;
        const pathAndOptions = template.substring(eachStart + 7, arrowIndex).trim();
        let bracketCount = 1;
        let endIndex = arrowIndex + 2;
        while (endIndex < template.length && bracketCount > 0) {
            if (template.substring(endIndex, endIndex + 2) === "[[") {
                bracketCount++;
                endIndex += 2;
            } else if (template.substring(endIndex, endIndex + 2) === "]]") {
                bracketCount--;
                endIndex += 2;
            } else {
                endIndex++;
            }
        }
        if (bracketCount > 0) break;
        const { path: collectionPath } = parsePathAndOptions(pathAndOptions);
        blocks.push({
            path: collectionPath,
            body: template.substring(arrowIndex + 2, endIndex - 2),
            start: eachStart,
            end: endIndex,
        });
        searchFrom = endIndex;
    }
    return blocks;
}

function isInsideAnyEach(index: number, eachBlocks: EachBlock[]): boolean {
    return eachBlocks.some((block) => index >= block.start && index < block.end);
}

function extractContextualKeyRefs(eachBlocks: EachBlock[]): ContextualKeyRef[] {
    const refs: ContextualKeyRef[] = [];
    const tokenRe = /\[\[(key:)?\s*([a-zA-Z0-9_.-]+)(\s*\|[^\]]*)?\]\]/g;
    for (const block of eachBlocks) {
        let m;
        while ((m = tokenRe.exec(block.body))) {
            const full = m[0].toLowerCase();
            const path = m[2];
            if (!path || path === "item") continue;
            if (full.startsWith("[[each:") || full.startsWith("[[join:")) continue;
            const hasKeyPrefix = !!m[1];
            const isExplicitPath = path.includes(".");
            if (hasKeyPrefix || isExplicitPath) continue;
            refs.push({ collectionPath: block.path, path });
        }
    }
    return refs;
}

// Extrae todos los tokens [[key: ...]], [[each: ...]], [[join: ...]] de una plantilla
function extractTokens(template: string): {
    keys: string[];
    keyRefs: KeyRef[];
    contextualKeyRefs: ContextualKeyRef[];
    eachBlocks: string[];
    joinBlocks: string[];
} {
    const keys: string[] = [];
    const keyRefs: KeyRef[] = [];
    const contextualKeyRefs: ContextualKeyRef[] = [];
    const eachBlocks: string[] = [];
    const joinBlocks: string[] = [];
    if (!template) return { keys, keyRefs, contextualKeyRefs, eachBlocks, joinBlocks };
    const eachBlockSpans = findEachBlocks(template);
    contextualKeyRefs.push(...extractContextualKeyRefs(eachBlockSpans));
    // [[key: ...]] y [[campo]]
    const keyRe = /\[\[(key:)?\s*([a-zA-Z0-9_.-]+)(\s*\|[^\]]*)?\]\]/g;
    let m;
    while ((m = keyRe.exec(template))) {
        if (m[2] && !m[0].toLowerCase().startsWith("[[each:") && !m[0].toLowerCase().startsWith("[[join:")) {
            // [[item]] y campos internos de cada iteración (ej: [[code]], [[name]]) no son paths top-level de hotel_config.
            // Validamos como key de hotel_config solo:
            //  - tokens explícitos con prefijo key:
            //  - paths con punto (a.b.c)
            const hasKeyPrefix = !!m[1];
            const isPath = m[2].includes(".");
            const isContextualSimpleToken = !hasKeyPrefix && !isPath && isInsideAnyEach(m.index, eachBlockSpans);
            if (isContextualSimpleToken) continue;
            keyRefs.push({ path: m[2], hasKeyPrefix });
            if (m[2] !== "item" && (hasKeyPrefix || isPath)) keys.push(m[2]);
        }
    }
    // [[each: path | ... -> ...]]
    const eachRe = /\[\[each:\s*([a-zA-Z0-9_.-]+)[^\]]*->/g;
    while ((m = eachRe.exec(template))) {
        if (m[1]) eachBlocks.push(m[1]);
    }
    // [[join: path | ... -> ...]]
    const joinRe = /\[\[join:\s*([a-zA-Z0-9_.-]+)[^\]]*->/g;
    while ((m = joinRe.exec(template))) {
        if (m[1]) joinBlocks.push(m[1]);
    }
    return { keys, keyRefs, contextualKeyRefs, eachBlocks, joinBlocks };
}

// Valida una plantilla contra hotel_config y seed
export async function validateKbTemplate({
    hotelConfig,
    template,
    seedTemplate,
    promptKey,
}: {
    hotelConfig: any;
    template: string;
    seedTemplate?: string;
    promptKey?: string;
}): Promise<{
    missingFromHotelConfig: string[];
    missingFromRuntime: string[];
    missingContextualFields: string[];
    invalidEachBlocks: string[];
    invalidJoinBlocks: string[];
    tokensMissingInDBVersion: string[];
    legacyRuntimeCandidates: string[];
    summary: "OK" | "ISSUES";
}> {
    const { keys, keyRefs, contextualKeyRefs, eachBlocks, joinBlocks } = extractTokens(template);
    const missingFromHotelConfig: string[] = [];
    const missingFromRuntime: string[] = [];
    const missingContextualFields: string[] = [];
    const invalidEachBlocks: string[] = [];
    const invalidJoinBlocks: string[] = [];
    const legacyRuntimeCandidates: string[] = [];
    const runtimeKeys = new Set(listRuntimeKeys(promptKey || "").map((k) => `runtime.${k}`));
    const legacyRuntimeKeys = new Set(listRuntimeKeys(promptKey || ""));
    // Verifica existencia de cada key en hotelConfig
    for (const ref of keyRefs) {
        const k = ref.path;
        if (k === "item") continue;
        // runtime explícito
        if (k.startsWith("runtime.")) {
            if (!runtimeKeys.has(k)) missingFromRuntime.push(k);
            continue;
        }
        // legacy runtime (sin prefijo)
        if (ref.hasKeyPrefix && !k.includes(".") && legacyRuntimeKeys.has(k)) {
            legacyRuntimeCandidates.push(k);
            continue;
        }
        // hotel_config normal
        const v = getIn(hotelConfig, k);
        if (v === undefined || v === null) missingFromHotelConfig.push(k);
    }
    // Verifica tokens simples dentro de each contra el item de la colección.
    for (const ref of contextualKeyRefs) {
        const collection = getIn(hotelConfig, ref.collectionPath);
        if (!Array.isArray(collection) || collection.length === 0) continue;
        const existsInAnyItem = collection.some((item) => {
            const v = getIn(item, ref.path);
            return v !== undefined && v !== null;
        });
        if (!existsInAnyItem) missingContextualFields.push(`${ref.collectionPath}[].${ref.path}`);
    }
    // Verifica eachBlocks:
    // - paths con punto (a.b.c): deben existir como array en hotel_config
    // - paths simples (ej: "highlights" dentro de [[each: rooms -> ...]]): pueden ser contextuales del item y no se invalidan aquí
    for (const path of eachBlocks) {
        if (!path.includes(".")) {
            const topLevel = getIn(hotelConfig, path);
            if (topLevel === undefined) continue;
            if (Array.isArray(topLevel)) continue;
            invalidEachBlocks.push(path);
            continue;
        }
        const val = getIn(hotelConfig, path);
        if (!Array.isArray(val)) invalidEachBlocks.push(path);
    }
    // Verifica joinBlocks con la misma lógica contextual de eachBlocks
    for (const path of joinBlocks) {
        if (!path.includes(".")) {
            const topLevel = getIn(hotelConfig, path);
            if (topLevel === undefined) continue;
            if (Array.isArray(topLevel)) continue;
            invalidJoinBlocks.push(path);
            continue;
        }
        const val = getIn(hotelConfig, path);
        if (!Array.isArray(val)) invalidJoinBlocks.push(path);
    }
    // tokensMissingInDBVersion: tokens en seed pero no en template actual
    let tokensMissingInDBVersion: string[] = [];
    if (seedTemplate) {
        const { keys: seedKeys } = extractTokens(seedTemplate);
        tokensMissingInDBVersion = seedKeys.filter(k => !keys.includes(k));
    }
    const summary =
        missingFromHotelConfig.length || missingFromRuntime.length || missingContextualFields.length || invalidEachBlocks.length || invalidJoinBlocks.length || tokensMissingInDBVersion.length
            ? "ISSUES"
            : "OK";
    return {
        missingFromHotelConfig,
        missingFromRuntime,
        missingContextualFields,
        invalidEachBlocks,
        invalidJoinBlocks,
        tokensMissingInDBVersion,
        legacyRuntimeCandidates,
        summary,
    };
}

function parsePathAndOptions(raw: string): { path: string; options: Record<string, string> } {
    const parts = raw.split("|").map((s: string) => s.trim()).filter(Boolean);
    const path = (parts[0] || "").replace(/^each:\s*/i, "").replace(/^join:\s*/i, "").trim();
    const options: Record<string, string> = {};
    for (const part of parts.slice(1)) {
        const m = part.match(/^([a-z0-9_-]+)\s*:\s*([\s\S]*)$/i);
        if (m) options[m[1]] = m[2];
    }
    return { path, options };
}

// Helper para acceder a paths tipo a.b.c
function getIn(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
        if (cur && typeof cur === "object" && p in cur) {
            cur = cur[p];
        } else {
            return undefined;
        }
    }
    return cur;
}
