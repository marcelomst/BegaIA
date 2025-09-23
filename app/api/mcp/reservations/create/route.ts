import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    await new Promise((r) => setTimeout(r, 400));
    const body = await req.json();
    // Simula creación exitosa
    return NextResponse.json({
        ok: true,
        reservationId: "mock-" + Math.floor(Math.random() * 1000000),
        status: "created",
    });
}
