import { NextRequest, NextResponse } from "next/server";
import { inspectDemoInventory, resetDemoInventory } from "@/lib/mcp/channelManagerAdapter";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hotelId = normalizeText(url.searchParams.get("hotelId"));
    if (!hotelId) {
      return NextResponse.json({ ok: false, error: "Missing hotelId" }, { status: 400 });
    }

    const startDate = normalizeText(url.searchParams.get("startDate"));
    const endDate = normalizeText(url.searchParams.get("endDate"));
    const roomType = normalizeText(url.searchParams.get("roomType")) || undefined;
    const rawGuests = normalizeText(url.searchParams.get("guests"));
    const guests = rawGuests ? Number.parseInt(rawGuests, 10) : undefined;

    const data = await inspectDemoInventory(hotelId, {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      roomType,
      guests: Number.isFinite(guests) ? guests : undefined,
    });

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const hotelId = normalizeText(body?.hotelId);
    const action = normalizeText(body?.action);

    if (!hotelId) {
      return NextResponse.json({ ok: false, error: "Missing hotelId" }, { status: 400 });
    }
    if (action !== "reset") {
      return NextResponse.json({ ok: false, error: "Unsupported action" }, { status: 400 });
    }

    const result = await resetDemoInventory(hotelId);
    const data = await inspectDemoInventory(hotelId);
    return NextResponse.json({ ok: true, result, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
