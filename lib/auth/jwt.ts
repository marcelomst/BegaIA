// /root/begasist/lib/auth/jwt.ts
import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const secret = process.env.JWT_SECRET!;
const key = new TextEncoder().encode(secret);

export interface JWTPayload {
  email: string;
  hotelId: string;
  roleLevel: number;
  userId: string;
  exp?: number;
}

// Firmar un JWT válido por 1 hora
export async function signJWT(payload: JWTPayload) {
  return new SignJWT(payload as JWTPayload & { [key: string]: unknown })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(key);
}

// Firmar un refresh token válido por 7 días
export async function signRefreshToken(payload: JWTPayload) {
  return new SignJWT(payload as JWTPayload & { [key: string]: unknown })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
}

// Verificar JWT (compatible con Edge Runtime)
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JWTPayload;
  } catch (err) {
    console.warn("🔐 JWT inválido o expirado:", err);
    return null;
  }
}

// Verificar refresh token
export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JWTPayload;
  } catch (err) {
    console.warn("🔄 Refresh token inválido o expirado:", err);
    return null;
  }
}

// ✅ Nuevo: Verificar token + nivel de rol requerido (mínimo o rango opcional)
export async function requireRoleLevel(req: NextRequest, minRoleLevel: number, maxRoleLevel?: number): Promise<JWTPayload> {
  const token = req.cookies.get("token")?.value;
  if (!token) {
    throw new Error("Token no encontrado");
  }

  const payload = await verifyJWT(token);
  if (!payload) {
    throw new Error("Token inválido o expirado");
  }

  if (payload.roleLevel < minRoleLevel) {
    throw new Error("Permisos insuficientes");
  }

  if (maxRoleLevel !== undefined && payload.roleLevel > maxRoleLevel) {
    throw new Error("Permisos insuficientes (por nivel máximo)");
  }

  return payload;
}
