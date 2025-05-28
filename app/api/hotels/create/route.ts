// /app/api/hotels/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createHotelWithAdmin } from "@/lib/services/hotel"; // 👈 Importa la función auxiliar

export async function POST(req: NextRequest) {
  try {
    const {
      hotelId,
      hotelName,
      timezone,
      defaultLanguage,
      adminEmail,
      adminPassword,
      adminRoleLevel,
      emailSettings, // <-- extrae emailSettings del body
    } = await req.json();

    // Usa la función centralizada para crear hotel y admin
    const result = await createHotelWithAdmin({
      hotelId,
      hotelName,
      timezone,
      defaultLanguage,
      adminEmail,
      adminPassword,
      adminRoleLevel,
      emailSettings, // <-- pásalo a la función
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Error inesperado" }, { status: 400 });
  }
}
