// Path: /root/begasist/lib/agents/reservations.ts
import { ChatOpenAI } from "@langchain/openai";
import { reservationSlotsSchema, type ReservationSlots, validateBusinessRules } from "@/lib/schemas/reservation";
import {
  checkAvailabilityTool,
  createReservationTool,
  type CheckAvailabilityOutput,
} from "@/lib/tools/mcp";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { chronoExtractDateRange, localizeRoomType } from "./helpers";

export type FillSlotsResult =
  | { need: "question"; question: string; partial?: Partial<ReservationSlots> }
  | { need: "none"; slots: ReservationSlots };

type AvailabilityOption = NonNullable<CheckAvailabilityOutput["options"]>[number];

const MODEL_FOR_SLOTS = process.env.LLM_SLOTS_MODEL || process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini";

const SLOTS_SYSTEM = `Sos un asistente de reservas de hotel.
Tu tarea es completar un JSON con los campos requeridos.
No inventes valores. Convertí fechas al formato ISO YYYY-MM-DD (sin hora).
Si falta información:
- Devolvé primero un JSON parcial SOLO con los campos que sean 100% seguros.
- Luego, en una línea aparte, una sola pregunta breve para avanzar.
Si está todo completo, devolvé SOLO el JSON completo sin texto extra.

Ejemplos de salida esperada:

1) Solo nombre (devolver JSON parcial + UNA pregunta breve)
Entrada:
Usuario: Marcelo Martinez
Salida:
{"guestName":"Marcelo Martinez","locale":"es"}
¿Cuál es el tipo de habitación que preferís?

2) Todo completo (devolver SOLO JSON completo, sin texto extra)
Entrada:
Usuario: Quiero reservar del 2025-10-19 al 2025-10-21, doble, para 2. Mi nombre es Ana Gómez.
Salida:
{"guestName":"Ana Gómez","roomType":"double","guests":2,"checkIn":"2025-10-19","checkOut":"2025-10-21","locale":"es"}

3) Fechas + tipo de habitación (falta huéspedes) (devolver JSON parcial + UNA pregunta breve)
Entrada:
Usuario: Del 19/10/2025 al 21/10/2025 en doble
Salida:
{"roomType":"double","checkIn":"2025-10-19","checkOut":"2025-10-21","locale":"es"}
¿Cuántos huéspedes se alojarán?`;

const SLOTS_USER_TEMPLATE = (userText: string, locale: string, hotelTz?: string, prevSlots?: Partial<ReservationSlots>) => `
Usuario: ${userText}

Datos previos conocidos (no los repreguntes, solo completá lo faltante):
${JSON.stringify(prevSlots ?? {}, null, 2)}

Requisitos JSON:
{
  "guestName": string,
  "roomType": string,
  "guests": number,
  "checkIn": "YYYY-MM-DD",
  "checkOut": "YYYY-MM-DD",
  "locale": ISO 639-1 string
}

Importante:
- "locale" debe ser exactamente un código ISO 639-1 (ej: "es", "en", "pt").
- Normalizá "roomType" (ej: "doble", "doble matrimonial" => "double"; "simple" => "single"; "suite" => "suite").
- NO uses HTML ni saltos dobles.
- NO inventes "guests". Si no lo dicen, dejalo vacío (o no lo incluyas).
Si falta algún dato, devolvé primero el JSON parcial (con lo seguro) y luego UNA pregunta breve.
Si está todo, devolvé SOLO el JSON correcto.

Contexto del sistema:
- Idioma esperado (ISO 639-1): ${locale}
- Timezone del hotel (opcional): ${hotelTz ?? "—"}`;

const JSON_BLOCK = /{[\s\S]*}/m;

// ——— Helpers de normalización locales (no exportar) ———
function toIsoDateTime(input: string | Date): string {
  if (input instanceof Date) {
    if (isNaN(input.getTime())) throw new Error("Invalid datetime");
    return input.toISOString();
  }
  const s = String(input || "").trim();
  if (!s) throw new Error("Invalid datetime");
  // YYYY-MM-DD → forzar 00:00:00Z
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00Z");
    if (isNaN(d.getTime())) throw new Error("Invalid datetime");
    return d.toISOString();
  }
  // Si ya parece ISO con tiempo, confiar en Date y normalizar a Z
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error("Invalid datetime");
  return d.toISOString();
}

function coerceGuests(value: unknown): number {
  const n = typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n) || n < 1) throw new Error("Invalid guests");
  return Math.floor(n);
}

type InputSlots = Partial<{
  guestName: string;
  roomType: string;
  checkIn: string | Date;
  checkOut: string | Date;
  numGuests: number | string;
  guests: number | string;
  locale: string;
}>;
type NormalizedSlots = {
  guestName?: string;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  numGuests?: number | string;
  locale?: string;
};
function normalizeBookingSlots(slots: InputSlots): NormalizedSlots {
  const out: Record<string, unknown> = { ...(slots || {}) };
  if (out.checkIn) out.checkIn = toIsoDateTime(out.checkIn as string | Date);
  if (out.checkOut) out.checkOut = toIsoDateTime(out.checkOut as string | Date);
  // Aceptar guests o numGuests; normalizar en 'guests' manteniendo el resto intacto
  const gSrc = typeof out.guests !== "undefined" ? out.guests : out.numGuests;
  if (typeof gSrc !== "undefined") out.guests = coerceGuests(gSrc as number | string);
  // Canonicalizar roomType aquí mismo de forma local
  if (typeof out.roomType === "string") {
    const rt = String(out.roomType).toLowerCase();
    const canonical =
      /^(doble|double|matrimonial)$/.test(rt) || /(doble\s+matrimonial|matrimonial\s+doble)/.test(rt)
        ? "double"
        : /^(twin|dos\s*camas|dos\s*individuales)$/.test(rt)
          ? "twin"
          : /^(single|simple|individual)$/.test(rt)
            ? "single"
            : /^(triple)$/.test(rt)
              ? "triple"
              : /^(suite)$/.test(rt)
                ? "suite"
                : rt;
    out.roomType = canonical;
  }
  return out as NormalizedSlots;
}

export async function fillSlotsWithLLM(
  userText: string,
  localeIso6391: "es" | "en" | "pt",
  opts?: { hotelTz?: string; prevSlots?: Partial<ReservationSlots> }
): Promise<FillSlotsResult> {
  const llm = new ChatOpenAI({ model: MODEL_FOR_SLOTS, temperature: 0.1 });
  // BP-S1 (antes de invocar al LLM):
  console.debug("[BP-SLOTS1] Prompt to LLM", {
    system: SLOTS_SYSTEM.slice(0, 120) + "...",
    user: SLOTS_USER_TEMPLATE(userText, localeIso6391, opts?.hotelTz, opts?.prevSlots),
    model: MODEL_FOR_SLOTS,
  });

  const resp = await llm.invoke([
    new SystemMessage(SLOTS_SYSTEM),
    new HumanMessage(SLOTS_USER_TEMPLATE(userText, localeIso6391, opts?.hotelTz, opts?.prevSlots)),
  ]);
  const text = (resp.content as string) ?? "";
  // BP-S2 (raw response del LLM):
  console.debug("[BP-SLOTS2] Raw LLM response", text);

  const jsonMatch = text.match(JSON_BLOCK);
  const questionAfterJson = jsonMatch ? text.replace(jsonMatch[0], "").trim() : "";

  // Feature flag para fallback determinístico mínimo (p. ej., nombre cuando el mensaje entero parece un nombre)
  const SLOT_FALLBACK_HEURISTICS = (process.env.SLOT_FALLBACK_HEURISTICS || "0") === "1";
  const roomTypes = ["doble", "double", "suite", "triple", "matrimonial", "single", "individual", "twin"];
  const prev = opts?.prevSlots || {};

  if (!jsonMatch) {
    const question = text.trim();
    // Heurística mejorada para slots parciales
    const t = userText.toLowerCase();
    const partial: Partial<ReservationSlots> = {};
    if (/\b(simple|individual|single)\b/.test(t)) partial.roomType = "single";
    else if (/\b(doble|matrimonial|double|twin)\b/.test(t)) partial.roomType = "double";
    else if (/\b(triple)\b/.test(t)) partial.roomType = "triple";
    else if (/\b(suite)\b/.test(t)) partial.roomType = "suite";

    // Extraer fechas (permite 1 o 2 fechas en el mensaje)
    const dateMatches = userText.match(/\b\d{2}\/\d{2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g);
    if (dateMatches && dateMatches.length > 0) {
      // Si hay dos fechas, la primera es check-in y la segunda check-out
      if (dateMatches.length >= 2) {
        partial.checkIn = normalizeDate(dateMatches[0]);
        partial.checkOut = normalizeDate(dateMatches[1]);
      } else if (dateMatches.length === 1) {
        // Si ya hay check-in en previos, esta es check-out; si no, es check-in
        if (opts?.prevSlots?.checkIn && !opts?.prevSlots?.checkOut) {
          partial.checkOut = normalizeDate(dateMatches[0]);
        } else if (!opts?.prevSlots?.checkIn) {
          partial.checkIn = normalizeDate(dateMatches[0]);
        }
      }
    } else {
      // Capa 1 avanzada con Chrono (si está activada) como fallback
      try {
        const chrono = await chronoExtractDateRange(userText, localeIso6391, opts?.hotelTz);
        if (chrono.checkIn && !partial.checkIn) partial.checkIn = chrono.checkIn;
        if (chrono.checkOut && !partial.checkOut) partial.checkOut = chrono.checkOut;
      } catch {
        // ignore chrono extraction failure
      }
    }

    // Extraer huéspedes (número seguido de "huésped", "personas", etc.)
    const mNumGuests = t.match(/(\d{1,2})\s*(hu[eé]sped(es)?|personas|adults?)/);
    if (mNumGuests) {
      partial.numGuests = Math.max(1, Math.min(9, parseInt(mNumGuests[1], 10)));
    } else {
      // fallback: cualquier número aislado si no hay slot previo
      const mNum = t.match(/\b(\d{1,2})\b/);
      if (mNum && !opts?.prevSlots?.numGuests) {
        partial.numGuests = Math.max(1, Math.min(9, parseInt(mNum[1], 10)));
      }
    }

    // Si el usuario da "check out" explícito
    if (/check[ -]?out|salida/.test(t) && dateMatches && dateMatches.length === 1) {
      partial.checkOut = normalizeDate(dateMatches[0]);
    }

    // Helper para normalizar fechas dd/mm/yyyy a yyyy-mm-dd
    function normalizeDate(d: string) {
      if (/\d{2}\/\d{2}\/\d{4}/.test(d)) {
        const [day, month, year] = d.split("/");
        return `${year}-${month}-${day}`;
      }
      return d;
    }

    // Heurística mínima para guestName cuando el mensaje parece un nombre
    if (!prev.guestName && SLOT_FALLBACK_HEURISTICS) {
      const name = extractNameIfLooksLikeOnlyName(userText);
      if (name && !roomTypes.includes(name.toLowerCase())) {
        partial.guestName = name;
      }
    }

    // Refuerzo: no sobrescribir guestName si ya existe y evitar nombres típicos de habitación
    // Si ya hay guestName, no lo sobrescribas
    if (prev.guestName) {
      partial.guestName = prev.guestName;
    } else if (partial.guestName && roomTypes.includes(partial.guestName.toLowerCase())) {
      // Si el valor detectado como guestName es un tipo de habitación, ignóralo
      delete partial.guestName;
    }
    // Merge con previos para no perder slots ya capturados
    const merged = { ...prev, ...partial };
    console.debug("[BP-SLOTS3] No JSON, returning question", { question, partial, merged });
    // SAFEGUARD: nunca devolver 'undefined' como pregunta
    let safeQuestion = question;
    if (!safeQuestion || typeof safeQuestion !== 'string' || safeQuestion.trim() === '' || safeQuestion === 'undefined' || safeQuestion === null || (typeof safeQuestion === 'string' && safeQuestion.trim().toLowerCase() === 'undefined')) {
      safeQuestion = localeIso6391 === 'es'
        ? "¿Cuál es el tipo de habitación que preferís?"
        : localeIso6391 === 'pt'
          ? "Qual o tipo de quarto que você prefere?"
          : "What room type do you prefer?";
    }
    return { need: "question", question: safeQuestion, partial: merged };
  }

  // Intentamos parsear crudo para rescatar campos parciales si Zod falla
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(jsonMatch![0]);
    // BP-S4 (cuando hay JSONMatch, antes de Zod):
    console.debug("[BP-SLOTS4] JSON match found", jsonMatch[0]);
    console.debug("[BP-SLOTS5] Raw JSON parsed", raw);

  } catch {
    // ignore invalid JSON from model
  }
  const full = {
    guestName: typeof (raw as { guestName?: unknown }).guestName === "string" ? (raw as { guestName?: string }).guestName : undefined,
    roomType: typeof (raw as { roomType?: unknown }).roomType === "string" ? (raw as { roomType?: string }).roomType : undefined,
    numGuests: typeof (raw as { numGuests?: unknown }).numGuests === "number" ? (raw as { numGuests?: number }).numGuests
      : typeof (raw as { guests?: unknown }).guests === "number" ? (raw as { guests?: number }).guests
        : undefined,
    checkIn: typeof (raw as { checkIn?: unknown }).checkIn === "string" ? (raw as { checkIn?: string }).checkIn : undefined,
    checkOut: typeof (raw as { checkOut?: unknown }).checkOut === "string" ? (raw as { checkOut?: string }).checkOut : undefined,
    // 👇 mantenemos ISO 639-1
    locale: typeof (raw as { locale?: unknown }).locale === "string" ? (raw as { locale?: string }).locale : localeIso6391,
  };

  // Si falta guestName en el JSON y el mensaje del usuario parece ser un nombre, aplicar fallback opcional
  if (!full.guestName && !prev.guestName && SLOT_FALLBACK_HEURISTICS) {
    const name = extractNameIfLooksLikeOnlyName(userText);
    if (name && !roomTypes.includes(name.toLowerCase())) {
      full.guestName = name;
    }
  }

  try {
    const parsed = reservationSlotsSchema.parse(full);
    // Si falta numGuests, repreguntamos en vez de error técnico
    if (typeof parsed.numGuests !== "number" || !Number.isFinite(parsed.numGuests) || parsed.numGuests <= 0) {
      return {
        need: "question" as const,
        question: localeIso6391 === "es"
          ? "¿Cuántos huéspedes se alojarán?"
          : localeIso6391 === "pt"
            ? "Quantos hóspedes irão se hospedar?"
            : "How many guests will stay?",
        partial: parsed,
      };
    }
    validateBusinessRules(parsed, localeIso6391, opts?.hotelTz);
    // BP-S5 (slots parseados OK por Zod):
    console.debug("[BP-SLOTS6] Zod validation OK", parsed);
    return { need: "none" as const, slots: parsed as ReservationSlots };
  } catch (err: unknown) {
    // Construimos un parcial seguro a partir de 'full'
    // BP-S6 (Zod ERROR):
    const zodErrorMessage = typeof err === "object" && err && "message" in err ? String((err as { message?: unknown }).message) : String(err);
    console.warn("[BP-SLOTS7] Zod validation ERROR", zodErrorMessage, { full });


    const partialFromFull: Partial<ReservationSlots> = {};
    if (full.guestName) partialFromFull.guestName = full.guestName;
    if (full.roomType) partialFromFull.roomType = full.roomType;
    if (typeof full.numGuests === "number" && full.numGuests > 0) partialFromFull.numGuests = full.numGuests;
    if (full.checkIn) partialFromFull.checkIn = full.checkIn;
    if (full.checkOut) partialFromFull.checkOut = full.checkOut;
    partialFromFull.locale = localeIso6391;

    // Intento adicional: si el modelo devolvió JSON parcial en 'jsonMatch[0]'
    let partialFromModel: Partial<ReservationSlots> | undefined;
    try {
      const maybe = JSON.parse(jsonMatch![0]); // ya garantizado por el return previo
      const p: Partial<ReservationSlots> = {};
      const mrec = maybe as Record<string, unknown>;
      if (typeof mrec.guestName === "string") p.guestName = mrec.guestName;
      if (typeof mrec.roomType === "string") p.roomType = mrec.roomType;
      if (typeof mrec.checkIn === "string") p.checkIn = mrec.checkIn;
      if (typeof mrec.checkOut === "string") p.checkOut = mrec.checkOut;
      if (typeof mrec.numGuests === "number") p.numGuests = mrec.numGuests;
      else if (typeof mrec.guests === "number") p.numGuests = mrec.guests;
      if (typeof mrec.locale === "string") p.locale = mrec.locale as ReservationSlots["locale"];
      partialFromModel = Object.keys(p ?? {}).length ? p : undefined;
    } catch {
      // ignore parse error of partialFromModel
    }

    const msgFromModel = questionAfterJson || "";
    const questionMsg = msgFromModel || (zodErrorMessage
      ? `Me falta un dato o hay un formato inválido: ${zodErrorMessage}. ¿Podés confirmarlo?`
      : "Necesito validar datos: ¿podés confirmar nombre, tipo de habitación, huéspedes y fechas (YYYY-MM-DD)?");

    // Preferimos el parcial más completo
    const mergedPartial = { ...(partialFromModel ?? {}), ...partialFromFull };
    return {
      need: "question" as const,
      // SAFEGUARD: nunca devolver 'undefined' como pregunta
      question: (!questionMsg || typeof questionMsg !== 'string' || questionMsg.trim() === '' || questionMsg === 'undefined' || questionMsg === null || (typeof questionMsg === 'string' && questionMsg.trim().toLowerCase() === 'undefined'))
        ? (localeIso6391 === 'es'
          ? "¿Cuál es el tipo de habitación que preferís?"
          : localeIso6391 === 'pt'
            ? "Qual o tipo de quarto que você prefere?"
            : "What room type do you prefer?")
        : questionMsg,
      partial: Object.keys(mergedPartial).length ? mergedPartial : undefined,
    };
  }
}

// ——— Utilidades determinísticas mínimas ———
function extractNameIfLooksLikeOnlyName(text: string): string | undefined {
  const raw = (text || "").trim();
  // Aceptar patrones: "soy X", "me llamo X", "mi nombre es X"
  const lower = raw.toLowerCase();
  const prefixMatch = lower.match(/^(soy|me llamo|mi nombre es)\s+(.{3,100})$/i);
  let candidate = prefixMatch ? prefixMatch[2] : raw;

  // Rechazar si contiene dígitos o símbolos raros
  if (/[^a-zA-ZáéíóúñüÁÉÍÓÚÑÜ\s\-']/u.test(candidate)) return undefined;
  // Debe tener entre 2 y 6 tokens
  const parts = candidate.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 6) return undefined;
  // Al menos 2 palabras con inicial mayúscula (o todo upper/lower tolerante a español)
  const looksProper = parts.filter((p) => /^[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü']+$/.test(p) || /^[A-ZÁÉÍÓÚÑÜ]{2,}$/.test(p)).length >= 2;
  if (!looksProper) return undefined;
  // Normalizar espacios
  candidate = parts.map((w) => w.replace(/\s+/g, " ")).join(" ");
  return candidate;
}

export async function askAvailability(hotelId: string, slots: ReservationSlots) {
  let norm: NormalizedSlots;
  try {
    const guestsInput = (slots as unknown as { guests?: number }).guests ?? slots.numGuests;
    norm = normalizeBookingSlots({ ...slots, guests: guestsInput });
  } catch (err) {
    console.error('[askAvailability] normalization error:', (err as Error)?.message);
    return {
      ok: false as const,
      message: (err && typeof (err as { message?: unknown }).message === 'string')
        ? `Error técnico al consultar disponibilidad: ${(err as { message: string }).message}`
        : 'Error técnico al consultar disponibilidad.',
    };
  }
  const roomType = norm.roomType ?? slots.roomType;
  const checkIn = norm.checkIn;
  const checkOut = norm.checkOut;
  const guestsNumber = norm.guests as number | undefined;
  console.debug('[askAvailability] called with:', { hotelId, roomType, numGuests: guestsNumber, checkIn, checkOut });
  let res;
  try {
    res = await checkAvailabilityTool({
      hotelId,
      roomType,
      guests: guestsNumber,
      checkIn,
      checkOut,
    });
    console.debug('[askAvailability] checkAvailabilityTool result:', res);
  } catch (err) {
    console.error('[askAvailability] Exception in checkAvailabilityTool:', err);
    return {
      ok: false as const,
      message: typeof (err as Error)?.message === 'string'
        ? `Error técnico al consultar disponibilidad: ${(err as Error).message}`
        : 'Error técnico al consultar disponibilidad.',
    };
  }

  if (!res || typeof res !== 'object') {
    console.error('[askAvailability] Invalid response from checkAvailabilityTool:', res);
    return {
      ok: false as const,
      message: 'Respuesta inválida del sistema de disponibilidad.',
    };
  }

  if (!res.ok) {
    console.warn('[askAvailability] checkAvailabilityTool returned not ok:', res);
    return {
      ok: false as const,
      message:
        res.error ??
        'No pude consultar la disponibilidad en este momento. Un recepcionista revisará tu solicitud.',
    };
  }

  if (res.available) {
    const option: AvailabilityOption | undefined = res.options?.[0];
    const loc = slots.locale ?? 'es';
    const lang2: 'es' | 'en' | 'pt' = loc === 'pt' ? 'pt' : loc === 'en' ? 'en' : 'es';
    const showRt = localizeRoomType(option?.roomType || roomType, lang2);
    // Calcular total estimado si tenemos pricePerNight y ambas fechas
    let enrichedText: string | undefined;
    if (option?.pricePerNight != null && checkIn && checkOut) {
      const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (24 * 60 * 60 * 1000)));
      const total = option.pricePerNight * nights;
      const curr = String(option.currency || '').toUpperCase();
      enrichedText =
        lang2 === 'es'
          ? `Tengo ${showRt} disponible. Tarifa por noche: ${option.pricePerNight} ${curr}. Total ${nights} noches: ${total} ${curr}.`
          : lang2 === 'pt'
            ? `Tenho ${showRt} disponível. Tarifa por noite: ${option.pricePerNight} ${curr}. Total ${nights} noites: ${total} ${curr}.`
            : `I have a ${showRt} available. Rate per night: ${option.pricePerNight} ${curr}. Total ${nights} nights: ${total} ${curr}.`;
    }
    const result: any = {
      ok: true as const,
      available: true as const,
      proposal: enrichedText || (option
        ? `Tengo ${showRt} disponible. Tarifa por noche: ${option.pricePerNight ?? '—'} ${option.currency ?? ''}.`
        : `Hay disponibilidad para ${showRt}.`),
      options: (res.options ?? []) as AvailabilityOption[],
    };
    if (res.toolCall) {
      // Clonar toolCall y agregar numGuests como string si existe
      result.toolCall = {
        ...res.toolCall,
        input: {
          ...res.toolCall.input,
          numGuests: res.toolCall.input.numGuests !== undefined ? String(res.toolCall.input.numGuests) : undefined,
        },
      };
    }
    return result;
  }

  const topAlternatives = (res.options ?? [])
    .map((o: AvailabilityOption) => o.roomType)
    .slice(0, 3)
    .join(', ');

  const result: any = {
    ok: true as const,
    available: false as const,
    proposal:
      res.options && res.options.length > 0
        ? `No tengo ${localizeRoomType(roomType, (slots.locale ?? 'es') === 'pt' ? 'pt' : (slots.locale ?? 'es') === 'en' ? 'en' : 'es')} en esas fechas, pero puedo ofrecer: ${topAlternatives}.`
        : `No tengo disponibilidad para ${localizeRoomType(roomType, (slots.locale ?? 'es') === 'pt' ? 'pt' : (slots.locale ?? 'es') === 'en' ? 'en' : 'es')} en esas fechas.`,
    options: (res.options ?? []) as AvailabilityOption[],
  };
  if (res.toolCall) {
    result.toolCall = res.toolCall;
  }
  return result;
}

export async function confirmAndCreate(hotelId: string, slots: ReservationSlots, channel: string = "web") {
  const guestsInput = (slots as unknown as { guests?: number }).guests ?? slots.numGuests;
  const norm = normalizeBookingSlots({ ...slots, guests: guestsInput });
  const res = await createReservationTool({
    hotelId,
    guestName: slots.guestName!,
    roomType: (norm.roomType ?? slots.roomType)!,
    guests: norm.guests as number,
    checkIn: norm.checkIn!,
    checkOut: norm.checkOut!,
    channel,
  });

  if (!res.ok || res.status !== "created" || !res.reservationId) {
    return {
      ok: false as const,
      message: res.error ?? "No pude crear la reserva. Un recepcionista te ayudará a completarla.",
    };
  }

  return {
    ok: true as const,
    reservationId: res.reservationId,
    message: `✅ Reserva creada. ID: ${res.reservationId}`,
  };
}

// === Sprint 3: modificar / cancelar ===
import { updateReservationTool, cancelReservationTool } from "@/lib/tools/mcp";

type _NormSlotsForModify = ReturnType<typeof normalizeBookingSlots>;

export async function modifyReservation(
  hotelId: string,
  reservationId: string,
  slots: ReservationSlots,
  channel: string = "web"
) {
  let norm: _NormSlotsForModify;
  try {
    const guestsInput = (slots as any).guests ?? slots.numGuests;
    norm = normalizeBookingSlots({ ...slots, guests: guestsInput });
  } catch (err) {
    return { ok: false as const, message: "Formato inválido en los datos de la modificación." };
  }
  const res = await updateReservationTool({
    hotelId,
    reservationId,
    roomType: (norm as any).roomType ?? slots.roomType,
    guests: (norm as any).guests as number | undefined,
    checkIn: (norm as any).checkIn,
    checkOut: (norm as any).checkOut,
    channel,
  });
  if (!res?.ok || res.status !== "updated") {
    return { ok: false as const, message: res?.error ?? "No pude modificar la reserva. Un recepcionista te ayudará." };
  }
  return { ok: true as const, message: "✅ Reserva actualizada correctamente." };
}

export async function cancelReservation(hotelId: string, reservationId: string) {
  const res = await cancelReservationTool({ hotelId, reservationId });
  if (!res?.ok || res.status !== "cancelled") {
    return { ok: false as const, message: res?.error ?? "No pude cancelar la reserva. Un recepcionista te ayudará." };
  }
  return { ok: true as const, message: "✅ Reserva cancelada." };
}
