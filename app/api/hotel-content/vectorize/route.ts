// Path: /app/api/hotel-content/vectorize/route.ts
import { NextRequest, NextResponse } from "next/server";
import { vectorizeHotelKb } from "@/lib/retrieval/index";

export async function POST(req: NextRequest) {
    try {
        const { hotelId } = await req.json();
        if (!hotelId || typeof hotelId !== "string") {
            return NextResponse.json({ error: "hotelId requerido" }, { status: 400 });
        }
        // Ejecutar vectorización usando solo el módulo principal autorizado
        const result = await vectorizeHotelKb(hotelId);
        // Se espera que result tenga { indexed, skipped } o similar
        return NextResponse.json({ status: "ok", ...result });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Error interno" }, { status: 500 });
    }
}
