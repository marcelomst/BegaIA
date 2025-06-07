// /app/api/hotel-document-details/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelAstraCollection } from "@/lib/astra/connection";
import type { ChunkResult } from "@/types/chunk";

export async function GET(req: NextRequest) {
  const hotelId = req.nextUrl.searchParams.get("hotelId");
  const originalName = req.nextUrl.searchParams.get("originalName");
  const version = req.nextUrl.searchParams.get("version");
  if (!hotelId || !originalName || !version) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }
  const collection = getHotelAstraCollection<ChunkResult>(hotelId);
  const chunks = await collection
    .find({ hotelId, originalName, version })
    .toArray();
  // Solo los campos útiles
  const details = chunks.map(chunk => ({
    category: chunk.category,
    promptKey: chunk.promptKey,
    text: chunk.text,
  }));
  return NextResponse.json({ ok: true, details });
}
