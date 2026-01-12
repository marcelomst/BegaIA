// Path: /root/begasist/app/api/hotel-content/list/route.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { verifyJWT } from "@/lib/auth/jwt";
import { listHotelContentVersions, normalizeVersionToTag, normalizeVersionToNumber } from "@/lib/astra/hotelContent";
import { getCurrentVersionFromIndex } from "@/lib/astra/hotelVersionIndex";
import { getAstraDB } from "@/lib/astra/connection";

function normalize(v: string | null | undefined) {
    return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

// Genera diff línea a línea extremadamente simple (no LCS avanzado, suficiente para panel)
function simpleLineDiff(a: string, b: string) {
    const aLines = a.split(/\r?\n/);
    const bLines = b.split(/\r?\n/);
    const max = Math.max(aLines.length, bLines.length);
    const out: Array<{ type: string; a?: string; b?: string; line: number }> = [];
    for (let i = 0; i < max; i++) {
        const av = aLines[i];
        const bv = bLines[i];
        if (av === bv) {
            if (av !== undefined) out.push({ type: 'same', a: av, b: bv, line: i + 1 });
        } else {
            if (av !== undefined && bv !== undefined) {
                out.push({ type: 'changed', a: av, b: bv, line: i + 1 });
            } else if (av !== undefined) {
                out.push({ type: 'removed', a: av, line: i + 1 });
            } else if (bv !== undefined) {
                out.push({ type: 'added', b: bv, line: i + 1 });
            }
        }
    }
    return out;
}

export async function GET(req: NextRequest) {
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
    const includeDiff = normalize(search.get("diff") || "") === '1';

    if (!hotelId || !rawCategoryId || !rawCategoryId.includes("/")) {
        return NextResponse.json({ error: "hotelId y categoryId requeridos" }, { status: 400 });
    }
    const [category, promptKey] = rawCategoryId.split("/");

    // Listar todas las versiones
    let all = await listHotelContentVersions(hotelId, category, promptKey, lang);
    if (!all || !all.length) {
        return NextResponse.json({ ok: true, hotelId, categoryId: rawCategoryId, lang, versions: [] });
    }

    // Ordenar por versionNumber asc
    all.sort((a: any, b: any) => {
        const av = normalizeVersionToNumber(a.versionTag || a.version);
        const bv = normalizeVersionToNumber(b.versionTag || b.version);
        return av - bv;
    });

    // Obtener currentVersion (índice) si existe para marcarla
    let currentVersionTag: string | undefined;
    try {
        const idx = await getCurrentVersionFromIndex(hotelId, category, promptKey, lang);
        if (idx?.currentVersion) currentVersionTag = normalizeVersionToTag(idx.currentVersion as any);
    } catch { /* ignore */ }

    const enriched = all.map((doc: any, i: number) => {
        const tag = doc.versionTag || normalizeVersionToTag(doc.version);
        const number = doc.versionNumber || normalizeVersionToNumber(tag);
        let diff: any = null;
        if (includeDiff && i > 0) {
            diff = simpleLineDiff(String(all[i - 1].body || ''), String(doc.body || ''));
        }
        return {
            versionTag: tag,
            versionNumber: number,
            _id: doc._id || null,
            createdAt: doc.createdAt || null,
            updatedAt: doc.updatedAt || null,
            title: doc.title || null,
            bodyChars: (doc.body || '').length,
            bodyPreview: String(doc.body || '').slice(0, 180),
            isCurrent: currentVersionTag ? currentVersionTag === tag : false,
            diff,
        };
    });

    return NextResponse.json({
        ok: true,
        hotelId,
        categoryId: rawCategoryId,
        lang,
        currentVersion: currentVersionTag || null,
        versions: enriched,
    });
}
