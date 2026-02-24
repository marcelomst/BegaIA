// Path: /root/begasist/app/api/poi/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchEvents } from "@/lib/poi/searchEvents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(v: string | null | undefined) {
  return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function requireSystemHotel(req: NextRequest) {
  const hdr = normalize(req.headers.get("x-hotel-id"));
  return hdr === "system";
}

export async function GET(req: NextRequest) {
  const adminKey = normalize(process.env.ADMIN_API_KEY);
  if (!adminKey) {
    return NextResponse.json({ error: "ADMIN_API_KEY missing", ok: false }, { status: 500 });
  }
  const hdrKey = normalize(req.headers.get("x-admin-key"));
  if (adminKey !== hdrKey) {
    return NextResponse.json({ error: "Unauthorized", ok: false }, { status: 401 });
  }
  if (!requireSystemHotel(req)) {
    return NextResponse.json({ error: "Forbidden (x-hotel-id)", ok: false }, { status: 403 });
  }

  const from = normalize(req.nextUrl.searchParams.get("from"));
  const to = normalize(req.nextUrl.searchParams.get("to"));
  const city = normalize(req.nextUrl.searchParams.get("city"));
  const region = normalize(req.nextUrl.searchParams.get("region"));
  const limitRaw = normalize(req.nextUrl.searchParams.get("limit"));

  if (!from || !to) {
    return NextResponse.json({ error: "from/to requeridos", ok: false }, { status: 400 });
  }

  const limit = limitRaw ? Number(limitRaw) : undefined;
  const events = await searchEvents({
    from,
    to,
    city: city || undefined,
    region: region || undefined,
    limit,
  });

  const query = {
    from,
    to,
    ...(city ? { city } : {}),
    ...(region ? { region } : {}),
    ...(Number.isFinite(limit) ? { limit } : {}),
  };
  console.log("[POI] /api/poi/events", { query, count: events.length });

  return NextResponse.json({
    ok: true,
    query,
    count: events.length,
    events,
  });
}
