// Path: /app/api/hotels/list-versions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { listVersionsForHotel } from "@/lib/retrieval/listVersionsForHotel";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hotelId = url.searchParams.get("hotelId");
  if (!hotelId) {
    return NextResponse.json({ error: "Missing hotelId" }, { status: 400 });
  }
  try {
    const versions = await listVersionsForHotel(hotelId);
    return NextResponse.json({ versions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
