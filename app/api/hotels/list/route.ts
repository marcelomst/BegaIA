// /app/api/hotels/list/route.ts
/**
 * Endpoint para obtener un listado de todos los hoteles registrados.
 * (Opcional: Filtra info sensible antes de devolver, si lo necesitás.)
 */
import { NextRequest, NextResponse } from "next/server";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";

export async function GET() {
  const configs = await getAllHotelConfigs();
  // Acá podrías mapear o limpiar los campos si lo necesitás
  return NextResponse.json({ hotels: configs });
}
