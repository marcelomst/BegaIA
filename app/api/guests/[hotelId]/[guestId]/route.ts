// Path: /root/begasist/app/api/guests/[hotelId]/[guestId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getGuest, updateGuest, createGuest } from "@/lib/db/guests";

// GET: Obtiene el perfil del guest (público)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ hotelId: string; guestId: string }> }
) {
  const { hotelId, guestId } = await context.params;
  if (!hotelId || !guestId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  const guest = await getGuest(hotelId, guestId);
  if (!guest) return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  return NextResponse.json(guest);
}

// POST: Crea o actualiza perfil guest (público)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ hotelId: string; guestId: string }> }
) {
  const { hotelId, guestId } = await context.params;
  if (!hotelId || !guestId) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }
  const data = await req.json();
  if (!data) {
    return NextResponse.json({ error: "Missing body" }, { status: 400 });
  }
  let guest = await getGuest(hotelId, guestId);
  if (!guest) {
    guest = await createGuest({ ...data, hotelId, guestId });
    return NextResponse.json(guest, { status: 201 });
  } else {
    await updateGuest(hotelId, guestId, data);
    guest = await getGuest(hotelId, guestId);
    return NextResponse.json(guest, { status: 200 });
  }
}
