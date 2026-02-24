// Helper para validación de plantillas KB: tokens, each, join, diferencias vs seed
import fs from "fs";
import path from "path";
import { listRuntimeKeys } from "@/lib/kb/runtimeContextSchema";

type KeyRef = { path: string; hasKeyPrefix: boolean };

// Extrae todos los tokens [[key: ...]], [[each: ...]], [[join: ...]] de una plantilla
function extractTokens(template: string): {
    keys: string[];
    keyRefs: KeyRef[];
    eachBlocks: string[];
    joinBlocks: string[];
} {
    const keys: string[] = [];
    const keyRefs: KeyRef[] = [];
    const eachBlocks: string[] = [];
    const joinBlocks: string[] = [];
    if (!template) return { keys, keyRefs, eachBlocks, joinBlocks };
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
    return { keys, keyRefs, eachBlocks, joinBlocks };
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
    invalidEachBlocks: string[];
    invalidJoinBlocks: string[];
    tokensMissingInDBVersion: string[];
    legacyRuntimeCandidates: string[];
    summary: "OK" | "ISSUES";
}> {
    const { keys, keyRefs, eachBlocks, joinBlocks } = extractTokens(template);
    const missingFromHotelConfig: string[] = [];
    const missingFromRuntime: string[] = [];
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
        missingFromHotelConfig.length || missingFromRuntime.length || invalidEachBlocks.length || invalidJoinBlocks.length || tokensMissingInDBVersion.length
            ? "ISSUES"
            : "OK";
    return {
        missingFromHotelConfig,
        missingFromRuntime,
        invalidEachBlocks,
        invalidJoinBlocks,
        tokensMissingInDBVersion,
        legacyRuntimeCandidates,
        summary,
    };
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
