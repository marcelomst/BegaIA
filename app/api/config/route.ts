// Path: /root/begasist/app/api/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function GET(req: NextRequest) {
  const hotelId = req.nextUrl.searchParams.get("hotelId");
  if (!hotelId) return NextResponse.json({ error: "Missing hotelId" }, { status: 400 });
  try {
    const config = await getHotelConfig(hotelId);
    return NextResponse.json({ hotel: config || {} });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
