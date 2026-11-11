import { NextRequest, NextResponse } from "next/server";
import { signJWT, verifyRefreshToken } from "@/lib/auth/jwt";
import { getHotelConfigCollection } from "@/lib/config/hotelConfig.server";
import type { HotelUser } from "@/types/user";

export async function GET(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "Falta refresh token" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);

  if (!payload) {
    return NextResponse.json({ error: "Refresh token inválido o expirado" }, { status: 401 });
  }

  const collection = getHotelConfigCollection();
  const config = await collection.findOne({ hotelId: payload.hotelId });
  const user = config?.users?.find(
    (candidate: HotelUser) => candidate.userId === payload.userId && candidate.active,
  );
  if (!config || !user) {
    return NextResponse.json({ error: "Sesión no autorizada" }, { status: 401 });
  }

  const newAccessToken = await signJWT({
    email: user.email,
    hotelId: config.hotelId,
    roleLevel: user.roleLevel,
    userId: user.userId,
  });

  const response = NextResponse.json({ success: true });

  response.cookies.set("token", newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60, // 1 hora
  });

  return response;
}
