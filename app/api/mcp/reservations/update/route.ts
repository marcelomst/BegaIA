import { NextRequest } from "next/server";
// Path: /root/begasist/app/api/mcp/reservations/update/route.ts
import { getCMAdapter } from "@/lib/mcp/channelManagerAdapter";
import type { UpdateReservationInput, UpdateReservationOutput } from "@/lib/mcp/types";

// POST /api/mcp/reservations/update
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Validar input (ajusta los campos según tu contrato)
        const input: UpdateReservationInput = {
            hotelId: String(body?.hotelId ?? "").trim(),
            reservationId: String(body?.reservationId ?? "").trim(),
            guestName: body?.guestName,
            guestEmail: body?.guestEmail,
            guestPhone: body?.guestPhone,
            roomType: body?.roomType,
            checkInDate: body?.checkIn,
            checkOutDate: body?.checkOut,
            notes: body?.notes,
        };
        if (!input.hotelId || !input.reservationId) {
            return Response.json({ ok: false, error: "Missing hotelId or reservationId" }, { status: 400 });
        }
        const cm = getCMAdapter(input.hotelId);
        await cm.updateReservation(input);
        const output: UpdateReservationOutput = {
            ok: true,
            status: "updated",
        };
        return Response.json(output);
    } catch (err: any) {
        return Response.json({ ok: false, error: err.message || "Unknown error" }, { status: 500 });
    }
}
