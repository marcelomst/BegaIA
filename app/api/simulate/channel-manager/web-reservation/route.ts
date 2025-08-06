// Path: /root/begasist/app/api/simulate/channel-manager/web-reservation/route.ts

import { NextResponse } from "next/server";
import type { ReservationDTO } from "@/types/externalDTOs";
// Import relativo para evitar errores de alias
// Update the import path if the file is actually located elsewhere, for example:
import { handleReservationNotification } from "@/lib/handlers/reservationHandler";

export async function POST(req: Request) {
  const reservation = (await req.json()) as ReservationDTO;
  try {
    await handleReservationNotification(reservation);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[simulate/web] error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
