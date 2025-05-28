// /app/api/hotels/delete-version/route.ts

import { NextResponse } from "next/server";
import { deleteVersionForHotel } from "@/lib/retrieval/deleteVersionForHotel";

export async function POST(req: Request) {
  const body = await req.json();
  const { hotelId, version } = body;
  if (!hotelId || !version) {
    return NextResponse.json({ error: "Falta hotelId o version" }, { status: 400 });
  }
  try {
    const result = await deleteVersionForHotel(hotelId, version);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
