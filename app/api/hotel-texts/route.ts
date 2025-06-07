// /app/api/hotel-texts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getOriginalTextChunksFromAstra } from "@/lib/astra/hotelTextCollection";

// GET /api/hotel-texts?hotelId=hotel123&originalName=hotel-demo-en-textonly.pdf&version=v1
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hotelId = searchParams.get("hotelId");
    const originalName = searchParams.get("originalName");
    const version = searchParams.get("version");

    if (!hotelId || !originalName || !version) {
      return NextResponse.json(
        { error: "Faltan parámetros requeridos: hotelId, originalName, version" },
        { status: 400 }
      );
    }

    const doc = await getOriginalTextChunksFromAstra({ hotelId, originalName, version });

    if (!doc) {
      return NextResponse.json(
        { error: "No encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, doc });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Error consultando hotelTextCollection", details: e?.message || String(e) },
      { status: 500 }
    );
  }
}
