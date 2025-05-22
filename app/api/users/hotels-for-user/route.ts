// /app/api/users/hotels-for-user/route.ts

import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";

/**
 * Valida login por email y password.
 * Devuelve los hoteles válidos donde el usuario está activo y el password coincide.
 */
export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { status: "error", message: "Faltan campos" },
      { status: 400 }
    );
  }

  // Trae todos los hoteles (y usuarios)
  const hotels = await getAllHotelConfigs();

  // Busca en TODOS los hoteles, a todos los usuarios activos con login local
  let matchingUsers: {
    userId: string;
    passwordHash: string;
    hotelId: string;
    name?: string;
  }[] = [];

  for (const hotel of hotels) {
    const user = hotel.users?.find(
      (u) =>
        u.email === email &&
        u.active &&
        u.passwordHash // solo login local
    );
    if (user) {
      const passOK = await compare(password, user.passwordHash!);
      console.log(`Comparando pass para userId=${user.userId} hotelId=${hotel.hotelId} => ${passOK}`);
      if (passOK) {
        matchingUsers.push({
          userId: user.userId,
          passwordHash: user.passwordHash as string,
          hotelId: hotel.hotelId,
          name: hotel.hotelName ?? hotel.hotelId,
        });
      }
    }
  }

  if (!matchingUsers.length) {
    return NextResponse.json(
      {
        status: "error",
        message:
          "Usuario no válido para login local. Verificá si está inactivo, sin contraseña o registrado con login federado.",
      },
      { status: 401 }
    );
  }

  // Prepara la lista para el selector
  const hotelList = matchingUsers.map((u) => ({
    hotelId: u.hotelId,
    name: u.name,
    userId: u.userId,
  }));

  return NextResponse.json({
    status: "ok",
    hotels: hotelList,
    autoLogin: hotelList.length === 1,
  });
}
