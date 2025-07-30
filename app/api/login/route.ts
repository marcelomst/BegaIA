// Path: /root/begasist/app/api/login/route.ts

import { NextResponse } from "next/server";
import { getHotelConfigCollection } from "@/lib/config/hotelConfig.server";
import { signJWT, signRefreshToken } from "@/lib/auth/jwt";
import type { HotelUser } from "@/types/user";

export async function POST(req: Request) {
  const { userId, hotelId } = await req.json();

  if (!userId || !hotelId) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const collection = getHotelConfigCollection();
  const config = await collection.findOne({ hotelId });
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }

  // Buscar usuario activo por userId
  const user = config.users.find((u: HotelUser) => u.userId === userId && u.active);
  if (!user) {
    return NextResponse.json({
      error: "Usuario no encontrado en este hotel o inactivo.",
    }, { status: 403 });
  }

  // 🚩 Chequeo clave: ¿tiene passwordHash?
  if (!user.passwordHash) {
    return NextResponse.json({
      error: "Tu cuenta aún no está activada. Revisá tu email y completá la activación para crear tu contraseña.",
    }, { status: 403 });
  }

  // Si todo OK, genera JWTs y cookies
  const accessToken = await signJWT({
    email: user.email,
    hotelId,
    roleLevel: user.roleLevel,
    userId: user.userId,
  });

  const refreshToken = await signRefreshToken({
    email: user.email,
    hotelId,
    roleLevel: user.roleLevel,
    userId: user.userId,
  });

  const response = NextResponse.json({ success: true });

  response.cookies.set("token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60,
  });

  response.cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
