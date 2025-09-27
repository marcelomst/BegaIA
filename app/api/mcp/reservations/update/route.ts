import { NextRequest } from "next/server";
import { getCMAdapter } from "@/lib/mcp/channelManagerAdapter";
import { UpdateReservationInput, UpdateReservationOutput } from "@/lib/mcp/types";

// POST /api/mcp/reservations/update
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Validar input (ajusta los campos según tu contrato)
        const input: UpdateReservationInput = body;
        if (!input.hotelId || !input.reservationId) {
            return Response.json({ ok: false, error: "Missing hotelId or reservationId" }, { status: 400 });
        }
        const cm = getCMAdapter();
        const updated = await cm.updateReservation(input);
        const output: UpdateReservationOutput = {
            ok: true,
            reservation: updated,
        };
        return Response.json(output);
    } catch (err: any) {
        return Response.json({ ok: false, error: err.message || "Unknown error" }, { status: 500 });
    }
}
