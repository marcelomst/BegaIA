import { NextRequest, NextResponse } from "next/server";
import { signJWT, verifyRefreshToken } from "@/lib/auth/jwt";

export async function GET(req: NextRequest) {
  const refreshToken = req.cookies.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "Falta refresh token" }, { status: 401 });
  }

  const payload = await verifyRefreshToken(refreshToken);

  if (!payload) {
    return NextResponse.json({ error: "Refresh token inválido o expirado" }, { status: 401 });
  }

  const newAccessToken = await signJWT({
    email: payload.email,
    hotelId: payload.hotelId,
    roleLevel: payload.roleLevel,
    userId: payload.userId,
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
