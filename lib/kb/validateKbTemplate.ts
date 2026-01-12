// Helper para validación de plantillas KB: tokens, each, join, diferencias vs seed
import fs from "fs";
import path from "path";

// Extrae todos los tokens [[key: ...]], [[each: ...]], [[join: ...]] de una plantilla
function extractTokens(template: string): {
    keys: string[];
    eachBlocks: string[];
    joinBlocks: string[];
} {
    const keys: string[] = [];
    const eachBlocks: string[] = [];
    const joinBlocks: string[] = [];
    if (!template) return { keys, eachBlocks, joinBlocks };
    // [[key: ...]] y [[campo]]
    const keyRe = /\[\[(key:)?\s*([a-zA-Z0-9_.-]+)(\s*\|[^\]]*)?\]\]/g;
    let m;
    while ((m = keyRe.exec(template))) {
        if (m[2] && !m[0].toLowerCase().startsWith("[[each:") && !m[0].toLowerCase().startsWith("[[join:")) {
            keys.push(m[2]);
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
    return { keys, eachBlocks, joinBlocks };
}

// Valida una plantilla contra hotel_config y seed
export async function validateKbTemplate({
    hotelConfig,
    template,
    seedTemplate,
}: {
    hotelConfig: any;
    template: string;
    seedTemplate?: string;
}): Promise<{
    missingFromHotelConfig: string[];
    invalidEachBlocks: string[];
    invalidJoinBlocks: string[];
    tokensMissingInDBVersion: string[];
    summary: "OK" | "ISSUES";
}> {
    const { keys, eachBlocks, joinBlocks } = extractTokens(template);
    const missingFromHotelConfig: string[] = [];
    const invalidEachBlocks: string[] = [];
    const invalidJoinBlocks: string[] = [];
    // Verifica existencia de cada key en hotelConfig
    for (const k of keys) {
        if (!getIn(hotelConfig, k)) missingFromHotelConfig.push(k);
    }
    // Verifica eachBlocks: debe ser array en hotelConfig
    for (const path of eachBlocks) {
        const val = getIn(hotelConfig, path);
        if (!Array.isArray(val)) invalidEachBlocks.push(path);
    }
    // Verifica joinBlocks: debe ser array en hotelConfig
    for (const path of joinBlocks) {
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
        missingFromHotelConfig.length || invalidEachBlocks.length || invalidJoinBlocks.length || tokensMissingInDBVersion.length
            ? "ISSUES"
            : "OK";
    return {
        missingFromHotelConfig,
        invalidEachBlocks,
        invalidJoinBlocks,
        tokensMissingInDBVersion,
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
