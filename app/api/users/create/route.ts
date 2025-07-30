// Path: /app/api/users/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { hotelId, email, name, position, roleLevel, password } = await req.json();

  if (!hotelId || !email) {
    return NextResponse.json({ error: "Faltan datos obligatorios (hotelId, email)" }, { status: 400 });
  }

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "La contraseña es obligatoria y debe tener al menos 6 caracteres" }, { status: 400 });
  }

  // ⛔️ Validación: sólo 'system' puede tener usuarios roleLevel 0
  if (roleLevel === 0 && hotelId !== "system") {
    return NextResponse.json(
      { error: "No se puede asignar roleLevel 0 fuera del hotel system" },
      { status: 400 }
    );
  }

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) {
    return NextResponse.json({ error: "Hotel no encontrado o sin usuarios" }, { status: 404 });
  }

  const exists = config.users.find((u) => u.email === email);
  if (exists) {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 400 });
  }

  const verificationToken = randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    userId: randomUUID(),
    email,
    name: name?.trim() || "",
    position: position?.trim() || "",
    roleLevel: roleLevel ?? 20,
    passwordHash, // 👈 Ahora sí guarda el hash bcrypt
    active: false, // 👈 Por defecto inactivo hasta que verifique
    verificationToken,
    createdAt: new Date().toISOString(),
  };

  config.users.push(newUser);
  await updateHotelConfig(hotelId, { users: config.users });

  return NextResponse.json({ ok: true });
}
