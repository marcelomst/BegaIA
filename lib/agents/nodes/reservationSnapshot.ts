// Path: /home/marcelo/begasist/lib/agents/nodes/reservationSnapshot.ts
import { formatReservationSnapshot } from "@/lib/format/reservationSnapshot";
import { getConvState } from "@/lib/db/convState";
import { AIMessage } from "@langchain/core/messages";
import type { GraphState as GS } from "@/lib/agents/graph";

export async function handleReservationSnapshotNode(state: typeof GS.State) {
    const lang = (state.detectedLanguage || "es").slice(0, 2);

    // Helpers
    const looksLikeCode = (s: string) => {
        if (typeof s !== "string") return false;
        const t = s.trim();
        return /^[A-Z]\-[A-Z0-9]{3,}$/i.test(t) || /^[A-Z0-9]{6,}$/i.test(t);
    };
    const deepFindCode = (obj: any, depth = 0): string | undefined => {
        if (!obj || typeof obj !== "object" || depth > 3) return undefined;
        for (const [, v] of Object.entries(obj)) {
            if (typeof v === "string" && looksLikeCode(v)) return v.trim();
            if (v && typeof v === "object") {
                const found = deepFindCode(v, depth + 1);
                if (found) return found;
            }
        }
        return undefined;
    };
    const extractCode = (lr: any): string | undefined => {
        if (!lr || typeof lr !== "object") return undefined;
        const candidates = [
            lr.reservationId,
            lr.code,
            lr.bookingCode,
            lr.id,
            lr.confirmationCode,
            lr.confirmation_id,
            lr.reference,
            lr.booking_reference,
            lr.locator,
            lr.locatorCode,
            lr.reservationCode,
        ];
        for (const c of candidates) {
            if (typeof c === "string" && c.trim().length > 0) return c.trim();
        }
        return deepFindCode(lr);
    };

    // 1) Usar cache de classifyNode si existe
    let st: any = (state.meta as any)?.persistedConvState || null;

    // 2) Slots en memoria como base
    let persistedSlots = state.reservationSlots || {};
    let persistedStage: string | undefined = state.salesStage;
    let code: string | undefined = extractCode((state as any)?.lastReservation);

    // 3) Si no hay cache, leemos de DB una sola vez
    if (!st) {
        try {
            st = await getConvState(state.hotelId, state.conversationId || "");
        } catch {
            st = null;
        }
    }

    // 4) Si tenemos algo persistido (cache o DB), sincronizamos
    if (st) {
        if ((st as { reservationSlots?: typeof state.reservationSlots })?.reservationSlots) {
            persistedSlots =
                (st as { reservationSlots?: typeof state.reservationSlots }).reservationSlots || {};
        }
        const maybe = st as unknown as {
            lastReservation?: Record<string, unknown>;
            salesStage?: string;
        };
        const persistedCode = extractCode(maybe?.lastReservation);
        if (persistedCode) code = persistedCode;
        if (typeof maybe?.salesStage === "string") persistedStage = maybe.salesStage;
    }

    // 5) Consolidar lastReservation “efectiva”
    const effectiveLastRes =
        (st && (st as any).lastReservation) ? (st as any).lastReservation : (state as any)?.lastReservation;

    // 6) Fallback: buscar código en la lastReservation efectiva o en todo el doc
    // Solo buscamos dentro de lastReservation (¡no escarbamos todo el documento!).
    if (!code) code = extractCode(effectiveLastRes);

    // 7) Preparar slots visuales
    const slots = { ...persistedSlots };
    let showSlots: Record<string, any> = { ...slots };
    if (typeof slots.numGuests === "number") {
        showSlots.numGuests = `${slots.numGuests}`;
    }

    // 8) Confirmación: code OR lastReservation OR stage close
    const confirmed =
        (typeof code === "string" && code.length > 0) ||
        !!effectiveLastRes ||
        ((persistedStage || "").toLowerCase() === "close");

    if (confirmed) {
        const sourceSlots =
            Object.keys(persistedSlots).length > 0 ? persistedSlots : state.reservationSlots || {};
        showSlots = {
            guestName: sourceSlots.guestName ?? "-",
            roomType: sourceSlots.roomType ?? "-",
            checkIn: sourceSlots.checkIn ?? "-",
            checkOut: sourceSlots.checkOut ?? "-",
            numGuests:
                typeof sourceSlots.numGuests === "number"
                    ? `${sourceSlots.numGuests}`
                    : (sourceSlots.numGuests ?? "-"),
        };
    }

    const msg = formatReservationSnapshot({
        slots: showSlots,
        code,
        lang,
        confirmed,
        addConfirmHint: !confirmed,
    });

    // Mantener desiredAction si el usuario estaba pidiendo modificar
    const t = (state.normalizedMessage || "").toLowerCase();
    const isModify = /\b(modificar|cambiar|modification|change|alterar|alteração|alterar|change)\b/.test(t);

    return {
        messages: [new AIMessage(msg)],
        reservationSlots: {
            ...slots,
            numGuests: typeof slots.numGuests === "number" ? `${slots.numGuests}` : slots.numGuests,
        },
        category: "reservation_snapshot",
        salesStage: persistedStage || state.salesStage,
        desiredAction: isModify ? "modify" : undefined,
    };
}
