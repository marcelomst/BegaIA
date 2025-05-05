// /app/api/debug/hotelPhoneMap/route.ts

import { NextResponse } from "next/server";
import { debugHotelPhoneMap } from "@/lib/config/hotelPhoneMap";

/**
 * Endpoint temporal para inspeccionar el caché de teléfonos -> hotelId.
 */
export async function GET() {
  console.log("🛠️ [DEBUG] Dump de hotelPhoneMap solicitado...");
  debugHotelPhoneMap();
  return NextResponse.json({ message: "Cache de teléfonos registrado en consola." });
}
