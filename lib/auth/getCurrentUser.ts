// /lib/auth/getCurrentUser.ts
import { cookies } from "next/headers";
import { verifyJWT } from "@/lib/auth/jwt";
import { collection } from "@/lib/config/hotelConfig.server";
import type { CurrentUser } from "@/lib/context/UserContext";

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies(); // ⬅️ Await cookies() since it returns a Promise
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  const payload = await verifyJWT(token);
  if (!payload) return null;

  const config = await collection.findOne({ hotelId: payload.hotelId });
  const hotelName = config?.hotelName || payload.hotelId;

  return {
    email: payload.email,
    hotelId: payload.hotelId,
    hotelName,
    roleLevel: payload.roleLevel,
    userId: payload.userId,
  };
}
