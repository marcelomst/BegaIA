// /app/api/users/delete/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { isRoleLevelZeroAllowed } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const { hotelId, userId } = await req.json();

  if (!hotelId || !userId) {
    return NextResponse.json({ error: "Faltan hotelId o userId" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
  }

  const existing = config.users.find((u) => u.userId === userId);
  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  // ⛔️ Bloqueo: no permitir eliminar usuario roleLevel 0 fuera de "system"
  if (!isRoleLevelZeroAllowed(hotelId, existing.roleLevel)) {
    return NextResponse.json(
      { error: "No se puede eliminar un usuario con roleLevel 0 fuera del hotel system" },
      { status: 403 }
    );
  }

  // Seguridad extra: prevenir eliminar usuario único admin
  const admins = config.users.filter((u) => u.roleLevel < 10);
  if (admins.length === 1 && existing.roleLevel < 10) {
    return NextResponse.json({ error: "No se puede eliminar el único administrador técnico" }, { status: 403 });
  }

  // Filtrar usuario
  config.users = config.users.filter((u) => u.userId !== userId);
  await updateHotelConfig(hotelId, { users: config.users });

  return NextResponse.json({ ok: true });
}
