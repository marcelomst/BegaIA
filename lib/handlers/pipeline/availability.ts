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

function extractRejectedPastCheckInFromAI(text: string): string | undefined {
    const raw = String(text || "");
    const rejected =
        /(ya pas[oó]|is in the past|j[aá] passou)/i.test(raw) &&
        /(check\s*-?in|ingreso|entrada|arrival)/i.test(raw);
    if (!rejected) return undefined;
    return extractDateRangeFromTextLight(raw).checkIn;
}

// Parser ligero de fechas dd/mm(/yyyy) → ISO (YYYY-MM-DD) usando año actual si falta
export function extractDateRangeFromTextLight(text: string): { checkIn?: string; checkOut?: string } {
    const MONTHS: Record<string, number> = {
        enero: 1, ene: 1, january: 1, jan: 1,
        febrero: 2, feb: 2, february: 2,
        marzo: 3, mar: 3, march: 3,
        abril: 4, apr: 4, april: 4,
        mayo: 5, may: 5,
        junio: 6, jun: 6, june: 6,
        julio: 7, jul: 7, july: 7,
        agosto: 8, aug: 8, august: 8,
        septiembre: 9, setiembre: 9, sept: 9, sep: 9, september: 9,
        octubre: 10, oct: 10, october: 10,
        noviembre: 11, nov: 11, november: 11,
        diciembre: 12, dic: 12, december: 12, dec: 12,
    };

    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const inferYear = (d: number, m: number, y?: number) => {
        if (typeof y === "number") {
            const full = y < 100 ? 2000 + y : y;
            return full;
        }
        let candidateYear = today.getFullYear();
        const candidate = new Date(Date.UTC(candidateYear, m - 1, d)).getTime();
        if (candidate < todayStart) candidateYear += 1;
        return candidateYear;
    };
    const toIso = (d: number, m: number, y?: number) => {
        const year = inferYear(d, m, y);
        return `${String(year).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    };

    const matches: Array<{ d: number; m: number; y?: number }> = [];

    // 1) numérico dd/mm(/yyyy)
    const reNumeric = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/g;
    let mn: RegExpExecArray | null;
    while ((mn = reNumeric.exec(text)) && matches.length < 2) {
        const d = parseInt(mn[1], 10);
        const mm = parseInt(mn[2], 10);
        const y = mn[3] ? parseInt(mn[3], 10) : undefined;
        if (d >= 1 && d <= 31 && mm >= 1 && mm <= 12) {
            matches.push({ d, m: mm, y });
        }
    }

    // 2) con nombre de mes (ej: "10 al 12 de abril", "10 de abril")
    if (matches.length < 2) {
        // patrón explícito de rango con mes nombrado al final: "10 al 12 de abril"
        const monthRange = text.match(/(\d{1,2})\s*(?:al|hasta|a)\s*(\d{1,2})\s*(?:de\s+)?([a-záéíóúñç]+)/i);
        if (monthRange) {
            const d1 = parseInt(monthRange[1], 10);
            const d2 = parseInt(monthRange[2], 10);
            const mnum = MONTHS[(monthRange[3] || "").toLowerCase()];
            if (mnum && d1 >= 1 && d1 <= 31 && d2 >= 1 && d2 <= 31) {
                matches.push({ d: d1, m: mnum }, { d: d2, m: mnum });
            }
        }
    }

    if (matches.length < 2) {
        const reMonth = /(\d{1,2})\s*(?:de\s+)?([a-záéíóúñç]+)(?:\s*(?:de)?\s*(\d{4}))?/gi;
        const monthHits: Array<{ d: number; m: number; y?: number }> = [];
        let mmatch: RegExpExecArray | null;
        while ((mmatch = reMonth.exec(text)) && monthHits.length < 2) {
            const d = parseInt(mmatch[1], 10);
            const monthKey = (mmatch[2] || "").toLowerCase();
            const mnum = MONTHS[monthKey];
            const y = mmatch[3] ? parseInt(mmatch[3], 10) : undefined;
            if (mnum && d >= 1 && d <= 31) monthHits.push({ d, m: mnum, y });
        }
        if (monthHits.length === 1 && /(?:al|hasta|a)\s+\d{1,2}\b/i.test(text)) {
            // patrón "10 al 12 de abril" (segundo día sin repetir mes)
            const endDay = parseInt((text.match(/(?:al|hasta|a)\s+(\d{1,2})\b/i) || [])[1] || "", 10);
            if (endDay >= 1 && endDay <= 31) {
                const base = monthHits[0];
                monthHits.push({ d: endDay, m: base.m, y: base.y });
            }
        }
        matches.push(...monthHits);
    }

    if (matches.length === 2) {
        const ciIso = toIso(matches[0].d, matches[0].m, matches[0].y);
        let coIso = toIso(matches[1].d, matches[1].m, matches[1].y);
        if (new Date(ciIso).getTime() > new Date(coIso).getTime()) {
            // Si ambas sin año y quedaron invertidas, asumir mismo mes siguiente año para checkout
            if (!matches[1].y && !matches[0].y) {
                const coYear = inferYear(matches[1].d, matches[1].m, matches[1].y) + 1;
                coIso = `${String(coYear).padStart(4, "0")}-${String(matches[1].m).padStart(2, "0")}-${String(matches[1].d).padStart(2, "0")}`;
            } else {
                return { checkIn: coIso, checkOut: ciIso };
            }
        }
        return { checkIn: ciIso, checkOut: coIso };
    }
    if (matches.length === 1) {
        const ciIso = toIso(matches[0].d, matches[0].m, matches[0].y);
        return { checkIn: ciIso };
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
    return /(a\s+que\s+hora|qué\s+hora|que\s+hora|what\s+time|horario|hours?)\s+(es\s+el\s+|do\s+)?(check\s*-?in|check\s*-?out)/i.test(t)
        || /\b(late\s+check\s*-?out|late\s+checkout|check\s*-?out\s+tard[ií]o|salida\s+tard[ií]a)\b/i.test(t);
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
            if (!(range.checkIn || range.checkOut)) continue;
            const next = lcHistory[i + 1];
            if (next instanceof AIMessage) {
                const rejectedCheckIn = extractRejectedPastCheckInFromAI(String((next as any).content || ""));
                if (rejectedCheckIn && range.checkIn === rejectedCheckIn && !range.checkOut) {
                    continue;
                }
            }
            return range;
        }
    }
    return {};
}

export function isPureConfirm(text: string): boolean {
    const normalized = normalizeReservationIntent(text);
    return normalized.executable && (normalized.kind === "confirm" || normalized.kind === "affirmative");
}

export type ReservationIntentKind =
    | "confirm"
    | "affirmative"
    | "deny_confirm"
    | "modify"
    | "cancel"
    | "other";

export type ReservationIntentNormalization = {
    kind: ReservationIntentKind;
    executable: boolean;
    normalizedText: string;
};

function normalizeReservationIntentText(text: string): string {
    return String(text || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[“”"'`]/g, "")
        .replace(/[¡!¿?.,;:()]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizeReservationIntent(text: string): ReservationIntentNormalization {
    const normalizedText = normalizeReservationIntentText(text);
    if (!normalizedText) return { kind: "other", executable: false, normalizedText };

    const isInquiry =
        /\b(confirm|confirmar|comfirmar|confimar)\b.*\b(si|if|se)\b.*\b(hay|have|tienen|tem|there is|availability|disponibilidad|lugar)\b/i.test(normalizedText) ||
        /\bantes de confirmar\b/i.test(normalizedText) ||
        /\b(before confirming|before i confirm)\b/i.test(normalizedText) ||
        /\b(me recordas|recordas|recordame|recordar|reconfirmas|reconfirmas|price|precio)\b/i.test(normalizedText);
    if (isInquiry) return { kind: "other", executable: false, normalizedText };

    const isCancelInquiry =
        /\b(cancel(ar)?|anul(ar)?|dar de baja)\b.*\b(si|if|se)\b.*\b(cobran|cobrar|charge|penalty|penalidad|policy|politica)\b/i.test(normalizedText) ||
        /\b(quiero saber si puedo cancelar|antes de cancelar|si cancelo)\b/i.test(normalizedText);
    if (isCancelInquiry) return { kind: "other", executable: false, normalizedText };

    const isModifyInquiry =
        /\b(modific(ar)?|cambi(ar)?|edit|change|update)\b.*\b(si|if|se)\b.*\b(hay|have|tem|availability|disponibilidad|lugar)\b/i.test(normalizedText) ||
        /\b(quiero modificar si hay lugar|quiero cambiar si hay lugar)\b/i.test(normalizedText) ||
        /\b(quiero saber si puedo|puedo|se puede|can i|can we|posso|da pra)\s+(modificar|cambiar|editar|alterar|change|edit|update|mudar)\b/i.test(normalizedText) ||
        /\bantes de\s+(modificar|cambiar|editar|alterar|change|edit|update|mudar)\b/i.test(normalizedText) ||
        /\bsi\s+(modifico|modificar|cambio|cambiar|edito|editar|altero|alterar|change|edit|update|mudar)\b.*\b(cobran|cobrar|charge|price|precio|policy|politica|penalidad|penalty)\b/i.test(normalizedText) ||
        /\b(modificar|cambiar|editar|alterar|change|edit|update|mudar)\b.*\b(me recordas|recordas|recordame|recordar|price|precio)\b/i.test(normalizedText);
    if (isModifyInquiry) return { kind: "other", executable: false, normalizedText };

    const denyConfirm =
        /\b(no|not|nunca|todavia no|aun no|aun no|not yet|ainda nao)\b.*\b(confirm|confirmar|comfirmar|confimar|confirmes|confirmarla|book|reserv)/i.test(normalizedText) ||
        /\bno confirm(es|ar)?\b/i.test(normalizedText) ||
        /\bdont confirm\b/i.test(normalizedText) ||
        /\bnao confirm(e|ar)\b/i.test(normalizedText);
    if (denyConfirm) return { kind: "deny_confirm", executable: false, normalizedText };

    if (/\b(cancel(ar|a|alo|ala)?|anul(ar|a)?|dar de baja|cancel booking|cancel reservation|cancela)\b/i.test(normalizedText)) {
        return { kind: "cancel", executable: true, normalizedText };
    }

    if (/\b(modific(ar|a|alo|ala)?|cambi(ar|a|alo|ala)?|edit(ar|a)?|alter(ar|a)?|change|update)\b/i.test(normalizedText)) {
        return { kind: "modify", executable: true, normalizedText };
    }

    const explicitConfirm =
        /\b(confirmar|comfirmar|confimar|cofirmar|confirmame|confirma|confirmalo|confirmarla)\b/i.test(normalizedText) ||
        /\b(confirm\b(?:\s+(?:book|booking|reservation))?|book it)\b/i.test(normalizedText) ||
        /\b(reserva|reservar|reserva la|reservalo|reservala|hacelo|adelante)\b/i.test(normalizedText);
    if (explicitConfirm) return { kind: "confirm", executable: true, normalizedText };

    if (isPureAffirmative(text, "es")) {
        return { kind: "affirmative", executable: true, normalizedText };
    }

    return { kind: "other", executable: false, normalizedText };
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
    const patterns = /(verifi(?:car|que) disponibilidad|¿dese[aá]s que verifique disponibilidad|verificar a disponibilidade|deseja que eu verifique a disponibilidade|check availability|do you want me to check availability)/i;
    for (let i = lcHistory.length - 1; i >= 0 && i >= lcHistory.length - 12; i--) {
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
    const normalizedWords = words.map((w) => w.replace(/á|à|ã/g, "a").replace(/é/g, "e"));
    const affirmative = new Set(["si", "sim", "yes", "dale", "ok", "okay", "perfecto", "claro", "por", "favor", "porfa", "de", "acuerdo", "manda", "ver", "pode", "sure", "please", "yup", "yep"]);
    const hasBase = normalizedWords.some((w) => affirmative.has(w));
    return hasBase && normalizedWords.every((w) => affirmative.has(w));
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
        const guestFirstName = String(snapshot.guestName || "").trim().split(/\s+/).filter(Boolean)[0] || "";
        const withNamePrefix = (text: string) => guestFirstName ? `${guestFirstName}, ${text.charAt(0).toLowerCase()}${text.slice(1)}` : text;
        if (perNight != null) {
            base = pre.lang === "es"
                ? `Tengo ${rtLocalized} disponible. Tarifa por noche: ${perNight} ${currency}. Total ${nights} noches: ${total} ${currency}.`
                : pre.lang === "pt"
                    ? `Tenho ${rtLocalized} disponível. Tarifa por noite: ${perNight} ${currency}. Total ${nights} noites: ${total} ${currency}.`
                    : `I have a ${rtLocalized} available. Rate per night: ${perNight} ${currency}. Total ${nights} nights: ${total} ${currency}.`;
            base = withNamePrefix(base);
        } else {
            base = pre.lang === "es"
                ? `Hay disponibilidad para ${rtLocalized}.`
                : pre.lang === "pt"
                    ? `Há disponibilidade para ${rtLocalized}.`
                    : `Availability for ${rtLocalized}.`;
            base = withNamePrefix(base);
        }
    }

    const needsGuests = !snapshot.numGuests;
    const needsName = !isSafeGuestName(snapshot.guestName || "");
    const hasPartialName = !!snapshot.guestName && !isSafeGuestName(snapshot.guestName || "");
    const askLastNameOnly =
        pre.lang === "es"
            ? "¿Cuál es tu apellido?"
            : pre.lang === "pt"
                ? "Qual é o seu sobrenome?"
                : "What's your last name?";
    const actionLine = availability.available
        ? (needsGuests
            ? `\n\n${buildAskGuests(pre.lang)}`
            : (needsName
                ? `\n\n${hasPartialName ? askLastNameOnly : buildAskGuestName(pre.lang)}`
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
