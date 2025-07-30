// Path: /root/begasist/app/api/me/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getHotelConfig } from "@/lib/config/hotelConfig.server"; // 👈 IMPORTÁ DEL SERVER

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Trae la config real del hotel
  const hotel = await getHotelConfig(user.hotelId);

  return NextResponse.json({
    email: user.email,
    hotelId: user.hotelId,
    hotelName: user.hotelName,
    roleLevel: user.roleLevel,
    userId: user.userId,
    defaultLanguage: hotel?.defaultLanguage || "en", // Idioma nativo del hotel!
  });
}
