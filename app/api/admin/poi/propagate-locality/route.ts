import { NextRequest, NextResponse } from "next/server";
import { propagateLocalityById } from "@/lib/db/poiCurate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(v: string | null | undefined) {
  return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function requireSystemHotel(req: NextRequest) {
  const hdr = normalize(req.headers.get("x-hotel-id"));
  return hdr === "system";
}

export async function POST(req: NextRequest) {
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

  console.log("[POI] /api/admin/poi/propagate-locality start", { id, locality });
  const { matched, updated } = await propagateLocalityById(id, locality, { updatedBy: "system" });
  console.log("[POI] /api/admin/poi/propagate-locality done", { id, locality, matched, updated });
  if (!matched) {
    return NextResponse.json({ ok: false, error: "POI not found", id }, { status: 404 });
  }
  return NextResponse.json({ ok: true, id, locality, matched, updated });
}
