// /app/api/hotels/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { collection } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  try {
    const {
      hotelId,
      hotelName,
      timezone,
      defaultLanguage,
      adminEmail,
      adminPassword,
    } = await req.json();

    if (!hotelId || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const existing = await collection.findOne({ hotelId });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un hotel con ese ID" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const newHotel = {
      hotelId,
      hotelName,
      timezone,
      defaultLanguage,
      channelConfigs: {
        web: { enabled: true, mode: "supervised" },
      },
      users: [
        {
          email: adminEmail,
          passwordHash,
          roleLevel: 0,
          active: true,
          createdAt: new Date().toISOString(),
        },
      ],
      lastUpdated: new Date().toISOString(),
    };

    await collection.insertOne(newHotel);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("❌ Error creando hotel:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
