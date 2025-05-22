// /app/api/me/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }


  return NextResponse.json({
    email: user.email,
    hotelId: user.hotelId,
    hotelName: user.hotelName, // 👈 nuevo
    roleLevel: user.roleLevel,
    userId: user.userId,
  });
}
