import { NextRequest, NextResponse } from "next/server";
import { setEventLocalityById } from "@/lib/db/poiCurate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(v: string | null | undefined) {
  return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function requireSystemHotel(req: NextRequest) {
  const hdr = normalize(req.headers.get("x-hotel-id"));
  return hdr === "system";
}

export async function PATCH(req: NextRequest) {
  const adminKey = normalize(process.env.ADMIN_API_KEY);
  if (!adminKey) {
    return NextResponse.json({ error: "ADMIN_API_KEY missing" }, { status: 500 });
  }
  const hdrKey = normalize(req.headers.get("x-admin-key"));
  if (adminKey !== hdrKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!requireSystemHotel(req)) {
    return NextResponse.json({ error: "Forbidden (x-hotel-id)" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || "").trim();
  const locality = String(body?.locality || "").trim();
  if (!id || !locality) {
    return NextResponse.json({ error: "id y locality requeridos" }, { status: 400 });
  }

  const { matched, updated } = await setEventLocalityById(id, locality, { updatedBy: "system" });
  if (!matched) {
    return NextResponse.json({ ok: false, error: "POI not found", id }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id, locality, matched, updated });
}
