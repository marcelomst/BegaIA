// /app/api/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/middleware/requireAuth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({
    email: user.email,
    hotelId: user.hotelId,
    roleLevel: user.roleLevel,
    userId: user.userId,
  });
}
