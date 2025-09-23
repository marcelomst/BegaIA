import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    // Simula un delay de red
    await new Promise((r) => setTimeout(r, 400));
    const body = await req.json();
    // Puedes personalizar la lógica de mock según el input
    return NextResponse.json({
        ok: true,
        available: true,
        options: [
            {
                roomType: body.roomType || "doble",
                pricePerNight: 100,
                currency: "USD",
                policies: "Cancelación flexible",
                availability: 3,
            },
        ],
    });
}
