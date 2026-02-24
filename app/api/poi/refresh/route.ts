// Path: /root/begasist/app/api/poi/refresh/route.ts
import { NextRequest, NextResponse } from "next/server";
import { refreshEventsJob } from "@/lib/poi/jobs/refreshEvents";

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

  console.log("[POI] /api/poi/refresh start");
  const metrics = await refreshEventsJob();
  console.log("[POI] /api/poi/refresh done", metrics);
  return NextResponse.json({ ok: true, ...metrics });
}
