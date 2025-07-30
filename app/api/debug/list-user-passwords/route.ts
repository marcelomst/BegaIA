// Path: /root/begasist/app/api/debug/list-user-passwords/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";
import { compare } from "bcryptjs";

/**
 * Endpoint de debug: lista para un email en todos los hoteles
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Falta email" }, { status: 400 });
  }

  const hotels = await getAllHotelConfigs();
  const results = [];

  for (const hotel of hotels) {
    const user = hotel.users?.find((u) => u.email === email);
    if (user) {
      let passOK = false;
      let passwordHash = user.passwordHash || null;
      if (password && typeof passwordHash === "string") {
        try {
          passOK = await compare(password, passwordHash); // PROMESA, no callback
        } catch {
          passOK = false;
        }
      }
      results.push({
        hotelId: hotel.hotelId,
        hotelName: hotel.hotelName,
        userId: user.userId,
        userName: user.name,
        active: user.active,
        passwordHash,
        passOK,
        hasResetToken: !!user.resetToken,
        hasVerificationToken: !!user.verificationToken,
      });
    }
  }

  return NextResponse.json({ found: results.length, users: results });
}
