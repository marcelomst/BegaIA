// /app/api/users/verify-account/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllHotelConfigs, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { signJWT, signRefreshToken } from "@/lib/auth/jwt";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  if (!token) {
    return NextResponse.json({ error: "Token faltante" }, { status: 400 });
  }

  const allConfigs = await getAllHotelConfigs();
  const match = allConfigs.find((cfg) =>
    cfg.users?.some((u) => u.verificationToken === token)
  );

  if (!match) {
    return NextResponse.json({ error: "Token inválido" }, { status: 404 });
  }

  const user = match.users!.find((u) => u.verificationToken === token);

  if (!user) {
    return NextResponse.json({ error: "Token inválido o expirado" }, { status: 404 });
  }

  // ✅ Marcar como activo y remover token
  user.active = true;
  delete user.verificationToken;

  await updateHotelConfig(match.hotelId, { users: match.users });

  // ✅ Emitir JWT y Refresh token para login automático tras verificación
  const jwtPayload = {
    email: user.email,
    hotelId: match.hotelId,
    roleLevel: user.roleLevel,
    userId: user.userId || user.email, // preferentemente userId, sino fallback email
  };

  const accessToken = await signJWT(jwtPayload);
  const refreshToken = await signRefreshToken(jwtPayload);

  const response = NextResponse.json({ accessToken });

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    path: "/",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return response;
}
