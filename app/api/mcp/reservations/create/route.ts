import { NextRequest, NextResponse } from "next/server";
// Path: /root/begasist/app/api/mcp/reservations/create/route.ts
import { getCMAdapter } from "@/lib/mcp/channelManagerAdapter";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const input = {
            hotelId: String(body?.hotelId ?? "").trim(),
            guestName: String(body?.guestName ?? "").trim(),
            guestEmail: typeof body?.guestEmail === "string" ? body.guestEmail : undefined,
            guestPhone: typeof body?.guestPhone === "string" ? body.guestPhone : undefined,
            roomType: String(body?.roomType ?? "").trim(),
            checkInDate: String(body?.checkIn ?? "").trim(),
            checkOutDate: String(body?.checkOut ?? "").trim(),
        };

        if (!input.hotelId || !input.guestName || !input.roomType || !input.checkInDate || !input.checkOutDate) {
            return NextResponse.json({ ok: false, error: "Missing required reservation fields" }, { status: 400 });
        }

        const cm = getCMAdapter(input.hotelId);
        const created = await cm.createReservation(input);
        return NextResponse.json({
            ok: true,
            reservationId: created.reservationId,
            status: "created",
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
