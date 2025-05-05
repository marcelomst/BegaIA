// /app/api/login/route.ts
import { NextResponse } from "next/server";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";
import bcrypt from "bcryptjs";
import type { HotelUser } from "@/types/user";
import { signJWT, signRefreshToken } from "@/lib/auth/jwt";
import { cookies } from "next/headers"; // ✅ Para manejar cookies

type HotelUserWithHotelId = HotelUser & { hotelId: string };

export async function POST(req: Request) {
  const { email, password } = await req.json();

  // 🔍 Buscar el usuario en todos los hoteles
  const hotels = await getAllHotelConfigs();
  console.log("🔍🔍🔍Hoteles cargados:", hotels);
  let foundUser: HotelUserWithHotelId | null = null;


  for (const hotel of hotels) {
    const user = hotel.users?.find(u => u.email === email && u.active);
    if (user) {
      foundUser = { ...user, hotelId: hotel.hotelId };
      break;
    }
  }

  if (!foundUser) {
    return NextResponse.json({ error: "Usuario no encontrado o inactivo" }, { status: 401 });
  }

  if (!foundUser.passwordHash) {
    return NextResponse.json({ error: "Usuario sin contraseña local" }, { status: 403 });
  }

  const valid = await bcrypt.compare(password, foundUser.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
  }

  // ✅ Generar JWT
  const accessToken = await signJWT({
    email: foundUser.email,
    hotelId: foundUser.hotelId,
    roleLevel: foundUser.roleLevel,
    userId: foundUser.userId,
  });
  
  const refreshToken = await signRefreshToken({
    email: foundUser.email,
    hotelId: foundUser.hotelId,
    roleLevel: foundUser.roleLevel,
    userId: foundUser.userId,
  });
  
   // ✅ Setear ambas cookies correctamente en un endpoint API
   const response = NextResponse.json({ success: true });

   response.cookies.set("token", accessToken, {
     httpOnly: true,
     secure: process.env.NODE_ENV === "production",
     sameSite: "strict",
     path: "/",
     maxAge: 60 * 60, // 1 hora
   });
 
   response.cookies.set("refreshToken", refreshToken, {
     httpOnly: true,
     secure: process.env.NODE_ENV === "production",
     sameSite: "strict",
     path: "/",
     maxAge: 60 * 60 * 24 * 7, // 7 días
   });
 
   return response;
 
}
