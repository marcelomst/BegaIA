import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
import { getAstraDB } from "@/lib/astra/connection";
import { getCollectionName } from "@/lib/retrieval";

export async function GET(req: NextRequest) {
    const adminKey = req.headers.get("x-admin-key");
    const ok = !!process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY;
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const db = await getAstraDB();
        const listed = await db.listCollections();
        const names = Array.isArray(listed) ? listed.map((c: any) => c.name) : [];
        const hotelId = req.nextUrl.searchParams.get("hotelId") || undefined;
        const required = [
            "category_registry",
            "hotel_text_collection",
            "hotel_version_index",
            ...(hotelId ? [getCollectionName(hotelId)] : []),
        ];
        const missing = required.filter((n) => !names.includes(n));
        return NextResponse.json({
            ok: true,
            keyspace: process.env.ASTRA_DB_KEYSPACE,
            url: process.env.ASTRA_DB_URL?.replace(/:[^@]*@/, ":***@"),
            count: names.length,
            names,
            required,
            missing,
            raw: listed,
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
    }
}
