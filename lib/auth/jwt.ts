import { SignJWT, jwtVerify } from "jose";

const secret = process.env.JWT_SECRET!;
const encoder = new TextEncoder();
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
  return new SignJWT(payload as JWTPayload & { [key: string]: unknown }) // 👈 fix aquí
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(key);
}

// Firmar un refresh token válido por 7 días
export async function signRefreshToken(payload: JWTPayload) {
  return new SignJWT(payload as JWTPayload & { [key: string]: unknown }) // 👈 fix aquí
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(key);
}

// Verificar JWT (compatible con Edge Runtime)
export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JWTPayload; // 👈 cast seguro
  } catch (err) {
    console.warn("🔐 JWT inválido o expirado:", err);
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as unknown as JWTPayload; // 👈 cast seguro
  } catch (err) {
    console.warn("🔄 Refresh token inválido o expirado:", err);
    return null;
  }
}

