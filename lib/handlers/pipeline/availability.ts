import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { askAvailability } from "@/lib/agents/reservations";
import { upsertConvState } from "@/lib/db/convState";
import { localizeRoomType, isSafeGuestName } from "@/lib/agents/helpers";

export type ReservationSlotsLike = {
    guestName?: string;
    roomType?: string;
    numGuests?: string;
    checkIn?: string;
    checkOut?: string;
    [k: string]: any;
};

export interface PreLike {
    lang: "es" | "en" | "pt";
    lcHistory: (HumanMessage | AIMessage)[];
    st?: any;
    msg: { hotelId: string; channel?: string };
    conversationId: string;
}

function safeNowISO() { return new Date().toISOString(); }

export function isoToDDMMYYYY(iso?: string): string | undefined {
    if (!iso) return undefined;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return undefined;
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

export function buildAskGuests(lang: "es" | "en" | "pt"): string {
    if (lang === "es") {
        return "¿Cuántos huéspedes se alojarán?";
    }
    if (lang === "pt") {
        return "Quantos hóspedes ficarão?";
    }
    return "How many guests will stay?";
}

export function buildAskGuestName(lang: "es" | "en" | "pt"): string {
    if (lang === "es") {
        return "¿A nombre de quién sería la reserva? (nombre y apellido)";
    }
    if (lang === "pt") {
        return "Em nome de quem será a reserva? (nome e sobrenome)";
    }
    return "Under what name should I make the booking? (first and last name)";
}

export function buildAskMissingDate(
    lang: "es" | "en" | "pt",
    missing: "checkIn" | "checkOut"
): string {
    const isOut = missing === "checkOut";
    if (lang === "es") {
        return isOut
            ? "Perfecto. ¿Podés confirmarme también la fecha de check-out? (formato dd/mm/aaaa)"
            : "Entendido. ¿Cuál sería la nueva fecha de check-in? (formato dd/mm/aaaa)";
    }
    if (lang === "pt") {
        return isOut
            ? "Perfeito. Pode me confirmar também a data de check-out? (formato dd/mm/aaaa)"
            : "Entendido. Qual seria a nova data de check-in? (formato dd/mm/aaaa)";
    }
    // en
    return isOut
        ? "Great. Could you also share the check-out date? (format dd/mm/yyyy)"
        : "Got it. What would be the new check-in date? (format dd/mm/yyyy)";
}

export function buildAskNewDates(lang: "es" | "en" | "pt"): string {
    if (lang === "es") {
        return "¿Cuáles serían las nuevas fechas de check-in y check-out? Podés enviarlas como 'dd/mm/aaaa a dd/mm/aaaa'.";
    }
    if (lang === "pt") {
        return "Quais seriam as novas datas de check-in e check-out? Você pode enviar como 'dd/mm/aaaa a dd/mm/aaaa'.";
    }
    return "What are the new check-in and check-out dates? You can send them as 'dd/mm/yyyy to dd/mm/yyyy'.";
}

// Capacidad por tipo de habitación (heurística simple)
function capacityFor(roomType?: string): number {
    const t = (roomType || "").toLowerCase();
    if (/single|sencilla|simple|individual/.test(t)) return 1;
    if (/double|doble|matrimonial/.test(t)) return 2;
    if (/triple/.test(t)) return 3;
    if (/quad|cuadruple|cuádruple|family|familiar/.test(t)) return 4;
    if (/suite/.test(t)) return 2; // por defecto
    return 2; // fallback conservador
}

export function chooseRoomTypeForGuests(currentType: string | undefined, guests: number): { target: string; changed: boolean } {
    const candidates = [
        { k: "single", cap: 1 },
        { k: "double", cap: 2 },
        { k: "triple", cap: 3 },
        { k: "quad", cap: 4 },
    ];
    const curCap = capacityFor(currentType);
    if (currentType && guests <= curCap) return { target: currentType, changed: false };
    const found = candidates.find((c) => guests <= c.cap);
    return { target: found ? found.k : (currentType || "double"), changed: !currentType || guests > curCap };
}

export function getProposedAvailabilityRange(
    lcHistory: (HumanMessage | AIMessage)[]
): { checkIn?: string; checkOut?: string } {
    let userLast: { checkIn?: string; checkOut?: string } = {};
    for (let i = lcHistory.length - 1; i >= 0 && i >= lcHistory.length - 12; i--) {
        const m = lcHistory[i];
        const txt = String((m as any).content || "");
        // Reusar extractDateRangeFromText indirectamente: evitar dependencia cruzada, hacemos un parser simple aquí
        const dates = extractDateRangeFromTextLight(txt);
        if (dates.checkIn && dates.checkOut) {
            if (m instanceof AIMessage && /(anot[eé] (?:nuevas\s+)?fechas|anotei as novas datas|noted the new dates)/i.test(txt)) {
                return { checkIn: dates.checkIn, checkOut: dates.checkOut };
            }
            if (m instanceof HumanMessage && !userLast.checkIn) {
                userLast = { checkIn: dates.checkIn, checkOut: dates.checkOut };
            }
        }
    }
    return userLast;
}

// Parser ligero de fechas dd/mm(/yyyy) → ISO (YYYY-MM-DD) usando año actual si falta
function extractDateRangeFromTextLight(text: string): { checkIn?: string; checkOut?: string } {
    const re = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/g;
    const matches: Array<{ d: number; m: number; y?: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) && matches.length < 2) {
        const d = parseInt(m[1], 10);
        const mm = parseInt(m[2], 10);
        const y = m[3] ? parseInt(m[3], 10) : undefined;
        if (d >= 1 && d <= 31 && mm >= 1 && mm <= 12) {
            matches.push({ d, m: mm, y });
        }
    }
    const year = (d?: number) => {
        if (!d) return new Date().getUTCFullYear();
        return d < 100 ? 2000 + d : d;
    };
    const toIso = (x: { d: number; m: number; y?: number }) => `${String(year(x.y)).padStart(4, "0")}-${String(x.m).padStart(2, "0")}-${String(x.d).padStart(2, "0")}`;
    if (matches.length === 2) {
        const a = new Date(toIso(matches[0]));
        const b = new Date(toIso(matches[1]));
        const ci = a <= b ? toIso(matches[0]) : toIso(matches[1]);
        const co = a <= b ? toIso(matches[1]) : toIso(matches[0]);
        return { checkIn: ci, checkOut: co };
    }
    // NUEVO: si solo hay una fecha, devolverla como un único extremo (checkIn) para permitir consolidación con follow-up
    if (matches.length === 1) {
        return { checkIn: toIso(matches[0]) };
    }
    return {};
}

export function detectDateSideFromText(text: string): ("checkIn" | "checkOut" | undefined) {
    const t = (text || "").toLowerCase();
    if (/(check\s*-?in\b|ingreso\b|inreso\b|entrada\b|arribo\b|arrival\b)/i.test(t) && !/(check\s*-?out|salida|egreso|retirada|partida|sa[ií]da|departure)/i.test(t)) {
        return "checkIn";
    }
    if (/(check\s*-?out\b|salida\b|egreso\b|retirada\b|partida\b|sa[ií]da\b|departure\b)/i.test(t) && !/(check\s*-?in|ingreso|inreso|entrada|arrival|arribo)/i.test(t)) {
        return "checkOut";
    }
    return undefined;
}

export function detectCheckinOrCheckoutTimeQuestion(text: string, _lang: "es" | "en" | "pt"): boolean {
    const t = (text || "").toLowerCase();
    return /(a\s+que\s+hora|qué\s+hora|que\s+hora|what\s+time|horario|hours?)\s+(es\s+el\s+|do\s+)?(check\s*-?in|check\s*-?out)/i.test(t);
}

// Detecta si el asistente ofreció confirmar horario exacto de check-in/out en los últimos turnos
export function askedToConfirmCheckTime(
    lcHistory: (HumanMessage | AIMessage)[],
    _lang: "es" | "en" | "pt"
): "checkin" | "checkout" | undefined {
    for (let i = lcHistory.length - 1; i >= 0 && i >= lcHistory.length - 3; i--) {
        const m = lcHistory[i];
        if (m instanceof AIMessage) {
            const txt = String((m as any).content || "").toLowerCase();
            const offered = /(puedo\s+confirmar\s+el\s+horario\s+exacto|posso\s+confirmar\s+o\s+hor[aá]rio\s+exato|i\s+can\s+confirm\s+the\s+exact\s+time)/i.test(txt);
            if (!offered) continue;
            const mentionsIn = /(check\s*-?in|ingreso|entrada|arrival)/i.test(txt);
            const mentionsOut = /(check\s*-?out|salida|egreso|retirada|partida|sa[ií]da|departure)/i.test(txt);
            if (mentionsIn && !mentionsOut) return "checkin";
            if (mentionsOut && !mentionsIn) return "checkout";
        }
    }
    return undefined;
}

export function getLastUserDatesFromHistory(lcHistory: (HumanMessage | AIMessage)[]): { checkIn?: string; checkOut?: string } {
    for (let i = lcHistory.length - 1; i >= 0; i--) {
        const m = lcHistory[i];
        if (m instanceof HumanMessage) {
            const txt = String((m as any).content || "");
            const range = extractDateRangeFromTextLight(txt);
            if (range.checkIn || range.checkOut) return range;
        }
    }
    return {};
}

export function isPureConfirm(text: string): boolean {
    if (!text) return false;
    const cleaned = text.trim().toUpperCase().replace(/[“”"'`]/g, "");
    return /^CONFIRMAR$/.test(cleaned);
}

export function isAskAvailabilityStatusQuery(text: string, lang: "es" | "en" | "pt"): boolean {
    const t = (text || "").trim().toLowerCase();
    if (!t) return false;
    const es = /(pudiste\s+(confirmar|verificar|chequear)|ya\s+pudiste|me\s+confirmaste|resultado\s+de\s+la\s+verificaci[oó]n)/i;
    const en = /(did\s+you\s+(check|confirm)|were\s+you\s+able\s+to\s+(check|confirm)|any\s+update\s+on\s+availability)/i;
    const pt = /(conseguiu\s+(verificar|confirmar)|voc[eê]\s+conseguiu|alguma\s+novidade\s+sobre\s+a\s+disponibilidade)/i;
    return (lang === "es" ? es : lang === "pt" ? pt : en).test(t);
}

export function askedToVerifyAvailability(lcHistory: (HumanMessage | AIMessage)[], lang: "es" | "en" | "pt"): boolean {
    const patterns = lang === "es"
        ? /(verifi(?:car|que) disponibilidad|¿dese[aá]s que verifique disponibilidad)/i
        : lang === "pt"
            ? /(verificar a disponibilidade|deseja que eu verifique a disponibilidade)/i
            : /(check availability|do you want me to check availability)/i;
    for (let i = lcHistory.length - 1; i >= 0 && i >= lcHistory.length - 4; i--) {
        const m = lcHistory[i];
        if (m instanceof AIMessage) {
            const txt = String((m as any).content || "");
            if (patterns.test(txt)) return true;
        }
    }
    return false;
}

// Versión estricta de asentimiento (sí/ok) para flujos de verificación de disponibilidad.
export function isPureAffirmative(text: string, lang: "es" | "en" | "pt"): boolean {
    const raw = (text || "").trim().toLowerCase();
    if (!raw) return false;
    const cleaned = raw.replace(/[¡!¿?.,;:…"'`~]+/g, "").trim();
    if (/(pero|but|porém|porem|however)/i.test(raw)) return false;
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 4) return false;
    const sets = {
        es: new Set(["si", "sí", "dale", "ok", "okay", "perfecto", "claro", "por", "favor", "porfa", "de", "acuerdo"]),
        pt: new Set(["sim", "ok", "okay", "claro", "por", "favor", "manda", "ver", "pode"]),
        en: new Set(["yes", "ok", "okay", "sure", "please", "yup", "yep"]),
    } as const;
    const baseSets = sets[lang];
    const hasBase = words.some(w => baseSets.has(w.replace(/á|à|ã/g, "a").replace(/é/g, "e")) || baseSets.has(w));
    return hasBase && words.every(w => baseSets.has(w) || ["de", "acuerdo", "por", "favor"].includes(w));
}

export async function runAvailabilityCheck(
    pre: PreLike,
    slots: ReservationSlotsLike,
    ciISO: string,
    coISO: string
): Promise<{ finalText: string; nextSlots: ReservationSlotsLike; needsHandoff: boolean }> {
    const snapshot: any = {
        guestName: slots.guestName || pre.st?.reservationSlots?.guestName,
        roomType: slots.roomType || pre.st?.reservationSlots?.roomType,
        numGuests: slots.numGuests || pre.st?.reservationSlots?.numGuests,
        checkIn: ciISO,
        checkOut: coISO,
        locale: pre.lang,
    };
    const availability = await askAvailability(pre.msg.hotelId, snapshot);
    try {
        await upsertConvState(pre.msg.hotelId, pre.conversationId, {
            reservationSlots: snapshot,
            lastProposal: {
                text:
                    (availability as any).proposal ||
                    (((availability as any).ok === false)
                        ? (pre.lang === "es" ? "Problema al consultar disponibilidad." : pre.lang === "pt" ? "Problema ao verificar disponibilidade." : "Issue checking availability.")
                        : (availability.available
                            ? (pre.lang === "es" ? "Hay disponibilidad." : pre.lang === "pt" ? "Há disponibilidade." : "Availability found.")
                            : (pre.lang === "es" ? "Sin disponibilidad." : pre.lang === "pt" ? "Sem disponibilidade." : "No availability."))),
                available: !!availability.available,
                options: availability.options,
                suggestedRoomType: availability?.options?.[0]?.roomType,
                suggestedPricePerNight: typeof availability?.options?.[0]?.pricePerNight === "number" ? availability.options![0]!.pricePerNight : undefined,
                toolCall: {
                    name: "checkAvailability",
                    input: {
                        hotelId: pre.msg.hotelId,
                        roomType: snapshot.roomType,
                        numGuests: snapshot.numGuests ? parseInt(String(snapshot.numGuests), 10) || 1 : undefined,
                        checkIn: snapshot.checkIn,
                        checkOut: snapshot.checkOut,
                    },
                    outputSummary: availability.available ? "available:true" : "available:false",
                    at: safeNowISO(),
                },
            },
            salesStage: availability.available ? "quote" : "followup",
            desiredAction: ((availability as any).ok === false || availability.available === false) ? "notify_reception" : (pre.st?.desiredAction),
            updatedBy: "ai",
        } as any);
    } catch (e) {
        console.warn("[runAvailabilityCheck] upsertConvState warn:", (e as any)?.message || e);
    }

    const isError = (availability as any).ok === false;
    let base = (availability as any).proposal ||
        (isError
            ? (pre.lang === "es" ? "Tuve un problema al consultar la disponibilidad." : pre.lang === "pt" ? "Tive um problema ao verificar a disponibilidade." : "I had an issue checking availability.")
            : (availability.available
                ? (pre.lang === "es" ? "Tengo disponibilidad." : pre.lang === "pt" ? "Tenho disponibilidade." : "I have availability.")
                : (pre.lang === "es" ? "No tengo disponibilidad en esas fechas." : pre.lang === "pt" ? "Não tenho disponibilidade nessas datas." : "No availability on those dates.")));

    if (availability.available && Array.isArray(availability.options) && availability.options.length > 0) {
        const opt: any = availability.options[0];
        const nights = Math.max(1, Math.round((new Date(coISO).getTime() - new Date(ciISO).getTime()) / (24 * 60 * 60 * 1000)));
        const perNight = typeof opt.pricePerNight === "number" ? opt.pricePerNight : undefined;
        const currency = String(opt.currency || "").toUpperCase();
        const total = perNight != null ? perNight * nights : undefined;
        const rtLocalized = localizeRoomType(opt.roomType || snapshot.roomType, pre.lang as any);
        if (perNight != null) {
            base = pre.lang === "es"
                ? `Tengo ${rtLocalized} disponible. Tarifa por noche: ${perNight} ${currency}. Total ${nights} noches: ${total} ${currency}.`
                : pre.lang === "pt"
                    ? `Tenho ${rtLocalized} disponível. Tarifa por noite: ${perNight} ${currency}. Total ${nights} noites: ${total} ${currency}.`
                    : `I have a ${rtLocalized} available. Rate per night: ${perNight} ${currency}. Total ${nights} nights: ${total} ${currency}.`;
        } else {
            base = pre.lang === "es"
                ? `Hay disponibilidad para ${rtLocalized}.`
                : pre.lang === "pt"
                    ? `Há disponibilidade para ${rtLocalized}.`
                    : `Availability for ${rtLocalized}.`;
        }
    }

    const needsGuests = !snapshot.numGuests;
    const needsName = !isSafeGuestName(snapshot.guestName || "");
    const actionLine = availability.available
        ? (needsGuests
            ? `\n\n${buildAskGuests(pre.lang)}`
            : (needsName
                ? `\n\n${buildAskGuestName(pre.lang)}`
                : (pre.lang === "es"
                    ? "\n\n¿Confirmás la reserva? Respondé “CONFIRMAR”."
                    : pre.lang === "pt"
                        ? "\n\nConfirma a reserva respondendo “CONFIRMAR”."
                        : "\n\nDo you confirm the booking? Reply “CONFIRMAR” (confirm).")))
        : "";

    let handoffLine = "";
    if (availability.available === false || isError) {
        const lastAi = [...pre.lcHistory].reverse().find((m) => m instanceof AIMessage) as AIMessage | undefined;
        const lastText = String((lastAi as any)?.content || "").toLowerCase();
        const alreadyHandoff = /recepcion|receptionist|humano|human|contato|contacto/.test(lastText);
        if (!alreadyHandoff) {
            handoffLine = pre.lang === "es"
                ? "\n\nUn recepcionista se pondrá en contacto con usted a la brevedad."
                : pre.lang === "pt"
                    ? "\n\nUm recepcionista entrará em contato com você em breve."
                    : "\n\nA receptionist will contact you shortly.";
        }
    }
    const finalText = `${base}${actionLine}${handoffLine}`.trim();
    const nextSlots = { ...slots, checkIn: ciISO, checkOut: coISO } as ReservationSlotsLike;
    return { finalText, nextSlots, needsHandoff: (availability.available === false || isError) };
}
