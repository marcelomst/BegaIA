// Path: /root/begasist/app/api/users/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import type { HotelUser } from "@/types/user";
import {
  isRoleLevelZeroAllowed,
  isSystemUser,
  isReception,
} from "@/lib/auth/roles";
import { verifyJWT } from "@/lib/auth/jwt";

function toInt(n: unknown): number {
  const v = Number(n);
  if (!Number.isFinite(v)) throw new Error("roleLevel inválido");
  return Math.trunc(v);
}

export async function POST(req: NextRequest) {
  try {
    // 🔐 Actor que hace el cambio
    const token = req.cookies.get("token")?.value;
    const payload = token ? await verifyJWT(token) : null;
    if (!payload) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const actor = {
      hotelId: String(payload.hotelId ?? ""),
      roleLevel: Number(payload.roleLevel ?? NaN),
    };
    if (!actor.hotelId || !Number.isFinite(actor.roleLevel)) {
      return NextResponse.json({ error: "invalid_actor_context" }, { status: 400 });
    }

    // 📦 Body
    const { hotelId, user }: { hotelId: string; user: HotelUser } = await req.json();

    if (!hotelId || !user || !user.userId) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (hotelId o userId)" },
        { status: 400 }
      );
    }

    // ⚖️ Permisos básicos:
    // - Recepción (>=20) no puede cambiar roles
    if (isReception(actor.roleLevel)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    // - No-system solo puede operar sobre su mismo hotel
    if (!isSystemUser(actor.roleLevel) && actor.hotelId !== hotelId) {
      return NextResponse.json({ error: "No autorizado (otro hotel)" }, { status: 403 });
    }

    // 🧮 roleLevel entrante saneado
    const newRoleLevel = toInt(user.roleLevel);

    // ⛔️ Rol 0 fuera de "system" (regla global existente)
    if (!isRoleLevelZeroAllowed(hotelId, newRoleLevel)) {
      return NextResponse.json(
        { error: "No se puede asignar roleLevel 0 fuera del hotel system" },
        { status: 400 }
      );
    }

    // (Opcional) Rango general 0..29
    if (newRoleLevel < 0 || newRoleLevel > 29) {
      return NextResponse.json({ error: "roleLevel fuera de rango" }, { status: 400 });
    }

    // 📑 Cargar hotel + usuarios
    const config = await getHotelConfig(hotelId);
    if (!config || !Array.isArray(config.users)) {
      return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
    }

    const existingUserIndex = config.users.findIndex((u) => u.userId === user.userId);
    if (existingUserIndex === -1) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const existingUser = config.users[existingUserIndex];

    // 🔒 Proteger al único admin técnico (roleLevel < 10)
    const admins = config.users.filter((u) => u.roleLevel < 10 && u.active);
    const isLastAdmin = admins.length === 1 && existingUser.roleLevel < 10;

    if (isLastAdmin) {
      // Intento de desactivar o degradar a >=10
      const willDeactivate = user.active === false;
      const willDegrade = newRoleLevel >= 10;
      if (willDeactivate || willDegrade) {
        return NextResponse.json(
          { error: "No se puede desactivar ni degradar al único administrador técnico" },
          { status: 403 }
        );
      }
    }

    // ✅ Actualizar campos permitidos del usuario
    const updated: HotelUser = {
      ...existingUser,
      name: user.name?.trim() || "",
      position: user.position?.trim() || "",
      roleLevel: newRoleLevel,
      active: user.active !== undefined ? user.active : existingUser.active,
      // preservar críticos
      email: existingUser.email,
      passwordHash: existingUser.passwordHash,
      userId: existingUser.userId,
      createdAt: existingUser.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const newUsers = [...config.users];
    newUsers[existingUserIndex] = updated;

    await updateHotelConfig(hotelId, { users: newUsers });

    return NextResponse.json({ ok: true, user: { userId: updated.userId, roleLevel: updated.roleLevel } });
  } catch (err: any) {
    console.error("[users/update] error:", err?.message || err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 400 });
  }
}
