import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAstraDB } from "@/lib/astra/connection";
import { verifyJWT } from "@/lib/auth/jwt";

function normalize(v: string | null | undefined) {
    return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

// In Next.js 15, params for dynamic API routes must be awaited
export async function GET(
    req: NextRequest,
    ctx: { params: Promise<{ categoryId: string }> }
) {
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

    const { categoryId: rawCategoryId } = await ctx.params;
    const categoryId = decodeURIComponent(rawCategoryId || "").trim();
    if (!categoryId || !categoryId.includes("/")) {
        return NextResponse.json({ error: "categoryId inválido" }, { status: 400 });
    }
    const wantLang = (search.get("lang") || "").trim().toLowerCase();

    const db = await getAstraDB();
    const col = db.collection("category_registry");
    try {
        const doc = await col.findOne({ categoryId });
        if (!doc) return NextResponse.json({ error: "No existe" }, { status: 404 });
        const { name, enabled } = doc as any;
        let templates: any = (doc as any).templates;
        // Si viene como string JSON (vía CQL), parsear
        if (typeof templates === "string") {
            try { templates = JSON.parse(templates); } catch { }
        }
        const payload = { categoryId, name, enabled, templates } as any;
        if (wantLang && templates && typeof templates === "object") {
            payload.template = templates[wantLang] ?? null;
        }
        return NextResponse.json({ ok: true, ...payload });
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (!/Collection does not exist/i.test(msg)) {
            return NextResponse.json({ error: msg }, { status: 500 });
        }
        // Fallback CQL
        const { getCassandraClient } = await import("@/lib/astra/connection");
        const client = getCassandraClient();
        const rs = await client.execute(
            `SELECT name, enabled, templates FROM "${process.env.ASTRA_DB_KEYSPACE}"."category_registry" WHERE "categoryId"=? LIMIT 1`,
            [categoryId],
            { prepare: true }
        );
        const row = rs.first();
        if (!row) return NextResponse.json({ error: "No existe" }, { status: 404 });
        const name = row.get("name");
        const enabled = row.get("enabled");
        let templates: any = row.get("templates");
        if (typeof templates === "string") {
            try { templates = JSON.parse(templates); } catch { }
        }
        const payload = { categoryId, name, enabled, templates } as any;
        if (wantLang && templates && typeof templates === "object") {
            payload.template = templates[wantLang] ?? null;
        }
        return NextResponse.json({ ok: true, ...payload });
    }
}
