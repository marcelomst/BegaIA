// /app/api/hotels/update/route.ts
/**
 * Endpoint para modificar datos de un hotel existente.
 * Solo permite cambiar campos no críticos.
 * Restricción: no se puede cambiar hotelId ni el nombre del hotel system.
 */
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId, updates } = await req.json();

  // Validación de campos básicos
  if (!hotelId || !updates) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }

  // ⚠️ No permitir cambio de hotelId
  if (updates.hotelId && updates.hotelId !== hotelId) {
    return NextResponse.json({ error: "No se puede cambiar el hotelId" }, { status: 400 });
  }

  // ⚠️ No cambiar nombre del hotel system
  if (hotelId === "system" && updates.hotelName) {
    return NextResponse.json({ error: "No se puede cambiar el nombre del hotel system" }, { status: 400 });
  }

  // Realiza la actualización (merge parcial)
  await updateHotelConfig(hotelId, updates);

  return NextResponse.json({ ok: true });
}
