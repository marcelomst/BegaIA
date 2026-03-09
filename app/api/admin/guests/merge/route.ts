// Path: /root/begasist/app/api/admin/guests/merge/route.ts

import { NextRequest, NextResponse } from "next/server";
import { mergeGuestsManual } from "@/lib/db/guestMerge";

function normalizeText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const hotelId = normalizeText(body.hotelId);
    const primaryGuestId = normalizeText(body.primaryGuestId);
    const secondaryGuestId = normalizeText(body.secondaryGuestId);
    const mergedBy = normalizeText(body.mergedBy) || "admin";

    if (!hotelId || !primaryGuestId || !secondaryGuestId) {
      return NextResponse.json(
        { error: "hotelId, primaryGuestId and secondaryGuestId are required" },
        { status: 400 },
      );
    }

    if (primaryGuestId === secondaryGuestId) {
      return NextResponse.json(
        { error: "primaryGuestId and secondaryGuestId must be different" },
        { status: 400 },
      );
    }

    const result = await mergeGuestsManual({
      hotelId,
      primaryGuestId,
      secondaryGuestId,
      mergedBy,
    });

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
