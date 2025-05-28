// /app/api/hotels/rollback-version/route.ts

import { NextResponse } from "next/server";
import { rollbackVersionForHotel } from "@/lib/retrieval/rollbackVersionForHotel";

export async function POST(req: Request) {
  const body = await req.json();
  const { hotelId, sourceVersion, userEmail } = body;
  if (!hotelId || !sourceVersion) {
    return NextResponse.json({ error: "Falta hotelId o sourceVersion" }, { status: 400 });
  }
  try {
    const result = await rollbackVersionForHotel(hotelId, sourceVersion, undefined, userEmail);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hotelId = searchParams.get("hotelId");
  const sourceVersion = searchParams.get("sourceVersion");
  if (!hotelId || !sourceVersion) {
    return NextResponse.json({ error: "Falta hotelId o sourceVersion" }, { status: 400 });
  }
  try {
    const result = await rollbackVersionForHotel(hotelId, sourceVersion);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}