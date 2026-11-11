// Path: /root/begasist/app/api/conversations/state/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getConvState } from "@/lib/db/convState";
import { getConversationById } from "@/lib/db/conversations";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { canAccessAdminRoute, resolveAuthorizedStaffHotelId } from "@/lib/auth/roles";

export async function GET(req: NextRequest) {
    try {
        const user = await getCurrentUser().catch(() => null);
        const url = new URL(req.url);
        const conversationId = url.searchParams.get("conversationId");

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }
        if (!canAccessAdminRoute(user.roleLevel, "/admin/inbox")) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }
        if (!conversationId) {
            return NextResponse.json({ error: "conversationId requerido" }, { status: 400 });
        }

        const hotelId = resolveAuthorizedStaffHotelId(user, url.searchParams.get("hotelId"));
        if (!hotelId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        // Validación básica: conversación pertenece al hotel solicitado
        const conv = await getConversationById(hotelId, conversationId).catch(() => null);
        if (!conv || conv.hotelId !== hotelId) {
            return NextResponse.json({ error: "No autorizado" }, { status: 403 });
        }

        const state = await getConvState(hotelId, conversationId);
        return NextResponse.json({
            reservationSlots: state?.reservationSlots ?? null,
            lastReservation: state?.lastReservation ?? null,
            lastProposal: state?.lastProposal ?? null,
            salesStage: state?.salesStage ?? null,
            updatedAt: state?.updatedAt ?? null,
        });
    } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 500 });
    }
}
