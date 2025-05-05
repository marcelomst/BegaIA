import { verifyJWT } from "@/lib/auth/jwt";
import type { JWTPayload } from "@/lib/auth/jwt";
import { NextRequest } from "next/server";

export async function requireAuth(req: NextRequest): Promise<JWTPayload | null> {
  const token = req.cookies.get("token")?.value;

  if (!token) return null;

  const payload = await verifyJWT(token);
  return payload ?? null;
}
