// Path: /root/begasist/app/api/users/hotels-for-user/route.ts

import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";

/**
 * Valida login por email y password.
 * Devuelve los hoteles válidos donde el usuario está activo y el password coincide.
 */
export async function POST(req: Request) {
  try {
    // leer body seguro
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { status: "error", message: "Body inválido o no-JSON" },
        { status: 400 }
      );
    }

    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { status: "error", message: "Faltan campos" },
        { status: 400 }
      );
    }

    // Trae todos los hoteles (y usuarios)
    const hotels = await getAllHotelConfigs();

    // Busca en TODOS los hoteles, a todos los usuarios activos con login local
    const matchingUsers: {
      userId: string;
      passwordHash: string;
      hotelId: string;
      name?: string;
    }[] = [];

    for (const hotel of hotels) {
      const user = hotel.users?.find(
        (u) => u.email === email && u.active && u.passwordHash
      );
      if (user) {
        const passOK = await compare(password, user.passwordHash!);
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
  } catch (err: any) {
    // 👇 Siempre JSON, incluso si truena Astra/envs
    console.error("[/api/users/hotels-for-user] Error:", err?.message || err);
    return NextResponse.json(
      {
        status: "error",
        message: "Fallo interno del servidor",
        detail: process.env.NODE_ENV === "development" ? String(err?.message || err) : undefined,
      },
      { status: 500 }
    );
  }
}
