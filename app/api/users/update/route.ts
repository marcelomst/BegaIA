// /app/api/users/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { HotelUser } from "@/types/user";
import { isRoleLevelZeroAllowed } from "@/lib/auth/roles";

export async function POST(req: NextRequest) {
  const { hotelId, user }: { hotelId: string; user: HotelUser } = await req.json();

  if (!hotelId || !user || !user.userId) {
    return NextResponse.json({ error: "Faltan datos obligatorios (hotelId o userId)" }, { status: 400 });
  }

  // ⛔️ Bloqueo: no permitir roleLevel 0 fuera de "system"
  if (!isRoleLevelZeroAllowed(hotelId, user.roleLevel)) {
    return NextResponse.json(
      { error: "No se puede asignar roleLevel 0 fuera del hotel system" },
      { status: 400 }
    );
  }
  console.log("Recibido update usuario", hotelId, user);
  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
  }
  console.log("Estado actual usuarios:", config.users);

  const existingUserIndex = config.users.findIndex((u) => u.userId === user.userId);
  if (existingUserIndex === -1) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const existingUser = config.users[existingUserIndex];

  // Seguridad: Prevenir desactivar o degradar el único admin técnico (roleLevel < 10)
  const admins = config.users.filter((u) => u.roleLevel < 10 && u.active);
  const isLastAdmin = admins.length === 1 && existingUser.roleLevel < 10;

  if (isLastAdmin) {
    // Intentando desactivar o cambiar rol a no admin técnico
    if (user.active === false || user.roleLevel >= 10) {
      return NextResponse.json({ error: "No se puede desactivar ni degradar al único administrador técnico" }, { status: 403 });
    }
  }

  // ✅ Actualización segura permitida
  config.users[existingUserIndex] = {
    ...existingUser,
    name: user.name?.trim() || "",
    position: user.position?.trim() || "",
    roleLevel: user.roleLevel,
    active: user.active !== undefined ? user.active : existingUser.active,
    // Preservar campos críticos
    email: existingUser.email,
    passwordHash: existingUser.passwordHash,
    userId: existingUser.userId,
    createdAt: existingUser.createdAt,
  };

  await updateHotelConfig(hotelId, { users: config.users });

  return NextResponse.json({ ok: true });
}
