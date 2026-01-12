import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getAstraDB } from "@/lib/astra/connection";
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
    // Default: marcar la versión como current salvo que explícitamente se envíe setCurrent=false
    const setCurrent: boolean = body?.setCurrent !== false;
    let version: string = (body?.version || "v1").toString();
    version = normalizeVersionToTag(version);

    if (!hotelId || !categoryId || !categoryId.includes("/")) {
        return NextResponse.json({ error: "hotelId y categoryId requeridos" }, { status: 400 });
    }
    const [category, promptKey] = categoryId.split("/");

    // Obtener templates desde category_registry (Document API o CQL)
    const db = await getAstraDB();
    const col = db.collection("category_registry");
    let template: { title?: string; body?: string } | null = null;
    try {
        const doc: any = await col.findOne({ categoryId });
        if (doc?.templates) {
            const tpl = typeof doc.templates === "string" ? JSON.parse(doc.templates) : doc.templates;
            template = tpl?.[lang] ?? null;
        }
    } catch (e: any) {
        const msg = String(e?.message || e);
        if (!/Collection does not exist/i.test(msg)) {
            return NextResponse.json({ error: msg }, { status: 500 });
        }
        // Fallback CQL
        // ... (idéntico a seed-to-hotel)
    }

    // Si no encontramos template en DB/CQL intentamos seed local
    if (!template) {
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
            // ignorar errores de lectura
        }
    }

    const effectiveBody = template?.body;
    const effectiveTitle = template?.title;
    if (!effectiveBody) {
        return NextResponse.json({ error: `Template inexistente para ${categoryId} (${lang}).` }, { status: 404 });
    }

    const record: HotelContent = {
        hotelId,
        category,
        promptKey,
        lang,
        version,
        type: inferType(category, promptKey),
        title: effectiveTitle || extractTitle(effectiveBody),
        body: effectiveBody,
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
