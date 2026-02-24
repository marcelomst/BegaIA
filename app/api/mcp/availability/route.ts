import { NextRequest, NextResponse } from "next/server";
// Path: /root/begasist/app/api/mcp/availability/route.ts
import { getCMAdapter } from "@/lib/mcp/channelManagerAdapter";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const hotelId = String(body?.hotelId ?? "").trim();
        if (!hotelId) {
            return NextResponse.json({ ok: false, error: "Missing hotelId" }, { status: 400 });
        }

        const cm = getCMAdapter(hotelId);
        const checkIn = typeof body?.checkIn === "string" ? body.checkIn : undefined;
        const checkOut = typeof body?.checkOut === "string" ? body.checkOut : undefined;
        const guests = typeof body?.guests === "number" ? body.guests : undefined;
        const roomType = typeof body?.roomType === "string" ? body.roomType : undefined;

        const options = await cm.searchAvailability({
            hotelId,
            startDate: checkIn ?? new Date().toISOString(),
            endDate: checkOut ?? new Date(Date.now() + 86400000).toISOString(),
            guests,
            roomType,
        });

        const available = options.some((opt) => (opt.availability ?? 0) > 0);
        return NextResponse.json({
            ok: true,
            available,
            options,
            toolCall: {
                name: "searchAvailability",
                input: {
                    hotelId,
                    roomType,
                    numGuests: guests,
                    checkIn,
                    checkOut,
                },
            },
        });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
    }
}
