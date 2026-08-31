// Path: /home/marcelo/begasist/lib/agents/nodes/reservationSnapshot.ts
import { formatReservationSnapshot } from "@/lib/format/reservationSnapshot";
import { getConvState } from "@/lib/db/convState";
import { getConversationsByGuestId } from "@/lib/db/conversations";
import { getGuest } from "@/lib/db/guests";
import { updateConversationState } from "@/lib/agents/stateUpdaterAgent";
import { AIMessage } from "@langchain/core/messages";
import type { LastPresentedReservations } from "@/lib/db/convState";
import type { GraphState } from "../graphState";

function getMergedIntoGuestId(guest: { tags?: unknown } | null | undefined): string | undefined {
    const tags = Array.isArray(guest?.tags) ? guest.tags : [];
    const tag = tags.find((value) => typeof value === "string" && value.startsWith("merged-into:"));
    return typeof tag === "string" ? tag.slice("merged-into:".length).trim() || undefined : undefined;
}

function getConfirmedReservationRecords(state: any): Array<Record<string, any>> {
    const records = [
        ...(Array.isArray(state?.reservationHistory) ? state.reservationHistory : []),
        state?.lastReservation,
    ];
    const byId = new Map<string, Record<string, any>>();
    for (const record of records) {
        const reservationId = String(record?.reservationId || "").trim();
        const status = String(record?.status || "").toLowerCase();
        if (!reservationId || (status !== "created" && status !== "updated")) continue;
        byId.set(reservationId, record);
    }
    return Array.from(byId.values());
}

function reservationSlotsFromRecord(record: Record<string, any>, state: any) {
    const slots = state?.reservationSlots || {};
    return {
        guestName: record.guestName ?? slots.guestName,
        roomType: record.roomType ?? slots.roomType,
        checkIn: record.checkIn ?? slots.checkIn,
        checkOut: record.checkOut ?? slots.checkOut,
        numGuests: record.numGuests ?? slots.numGuests,
    };
}

function buildPresentedReservations(
    guestId: string,
    records: Array<{ record: Record<string, any>; state: any }>,
): LastPresentedReservations {
    return {
        guestId,
        presentedAt: new Date().toISOString(),
        reservations: records.map(({ record, state }) => ({
            reservationId: String(record.reservationId),
            status: record.status === "updated" ? "updated" : "created",
            createdAt: String(record.createdAt || ""),
            channel: record.channel || "web",
            ...reservationSlotsFromRecord(record, state),
        })) as LastPresentedReservations["reservations"],
    };
}

function buildGuestReservationList(
    lang: string,
    reservations: LastPresentedReservations["reservations"],
): string {
    const header = lang === "pt"
        ? "Estas são suas reservas:"
        : lang === "en"
            ? "These are your bookings:"
            : "Estas son tus reservas:";
    return [
        header,
        ...reservations.map((reservation, index) =>
            `${index + 1}. ${reservation.reservationId} - ${reservation.guestName || "-"} - ${reservation.checkIn || "-"} → ${reservation.checkOut || "-"}`,
        ),
    ].join("\n");
}

async function persistPresentedReservations(
    state: typeof GraphState.State,
    context: LastPresentedReservations,
) {
    if (!state.conversationId) return;
    await updateConversationState(state.hotelId, state.conversationId, {
        lastPresentedReservations: context,
        updatedBy: "ai",
    } as any);
}

export async function handleReservationSnapshotNode(state: typeof GraphState.State) {
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
    let usedGuestFallback = false;
    let guestFallbackContext: LastPresentedReservations | null = null;

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

    // 7) Fallback read-only: current conversation remains dominant. When it has no
    // confirmed reservation, resolve only conversations already bound to the canonical guest.
    const currentConfirmedRecords = getConfirmedReservationRecords(st);
    if (currentConfirmedRecords.length === 0 && state.guestId) {
        try {
            const currentGuest = await getGuest(state.hotelId, state.guestId);
            const canonicalGuestId = getMergedIntoGuestId(currentGuest) || currentGuest?.guestId || state.guestId;
            const conversations = await getConversationsByGuestId({ hotelId: state.hotelId, guestId: canonicalGuestId });
            const records: Array<{ record: Record<string, any>; state: any }> = [];
            for (const conversation of conversations) {
                const conversationId = String(conversation?.conversationId || "").trim();
                if (!conversationId || conversationId === state.conversationId) continue;
                const historicalState = await getConvState(state.hotelId, conversationId);
                for (const record of getConfirmedReservationRecords(historicalState)) {
                    records.push({ record, state: historicalState });
                }
            }
            const uniqueRecords = Array.from(new Map(records.map((item) => [item.record.reservationId, item])).values());
            guestFallbackContext = buildPresentedReservations(canonicalGuestId, uniqueRecords);
            if (uniqueRecords.length === 1) {
                const candidate = uniqueRecords[0];
                persistedSlots = reservationSlotsFromRecord(candidate.record, candidate.state);
                code = String(candidate.record.reservationId);
                persistedStage = "close";
                usedGuestFallback = true;
            } else if (uniqueRecords.length > 1) {
                await persistPresentedReservations(state, guestFallbackContext);
                return {
                    messages: [new AIMessage(buildGuestReservationList(lang, guestFallbackContext.reservations))],
                    category: "reservation_snapshot",
                    lastPresentedReservations: guestFallbackContext,
                };
            }
        } catch {
            // A snapshot must remain conservative if the guest-wide lookup is unavailable.
        }
    }

    // 8) Preparar slots visuales
    const slots = { ...persistedSlots };
    let showSlots: Record<string, any> = { ...slots };
    if (typeof slots.numGuests === "number") {
        showSlots.numGuests = `${slots.numGuests}`;
    }

    // 9) Confirmación: code OR active lastReservation OR stage close
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

    if (guestFallbackContext) {
        await persistPresentedReservations(state, guestFallbackContext);
    }

    return {
        messages: [new AIMessage(msg)],
        ...(guestFallbackContext ? { lastPresentedReservations: guestFallbackContext } : {}),
        ...(usedGuestFallback
            ? {}
            : {
                reservationSlots: {
                    ...slots,
                    numGuests: typeof slots.numGuests === "number" ? `${slots.numGuests}` : slots.numGuests,
                },
            }),
        category: "reservation_snapshot",
        ...(usedGuestFallback ? {} : { salesStage: persistedStage || state.salesStage }),
        ...(usedGuestFallback ? {} : { desiredAction: isModify ? "modify" : undefined }),
    };
}
