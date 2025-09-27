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
        if (chrono.checkIn && !partial.checkIn) partial.checkIn = chrono.checkIn as any;
        if (chrono.checkOut && !partial.checkOut) partial.checkOut = chrono.checkOut as any;
      } catch { }
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
    return { need: "question", question: question || "Necesito un dato más…", partial: merged };
  }

  // Intentamos parsear crudo para rescatar campos parciales si Zod falla
  let raw: any = {};
  try {
    raw = JSON.parse(jsonMatch![0]);
    // BP-S4 (cuando hay JSONMatch, antes de Zod):
    console.debug("[BP-SLOTS4] JSON match found", jsonMatch[0]);
    console.debug("[BP-SLOTS5] Raw JSON parsed", raw);

  } catch { }
  const full = {
    guestName: typeof raw?.guestName === "string" ? raw.guestName : undefined,
    roomType: typeof raw?.roomType === "string" ? raw.roomType : undefined,
    numGuests: typeof raw?.numGuests === "number" ? raw.numGuests
      : typeof raw?.guests === "number" ? raw.guests
        : undefined,
    checkIn: typeof raw?.checkIn === "string" ? raw.checkIn : undefined,
    checkOut: typeof raw?.checkOut === "string" ? raw.checkOut : undefined,
    // 👇 mantenemos ISO 639-1
    locale: typeof raw?.locale === "string" ? raw.locale : localeIso6391,
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
  } catch (err: any) {
    // Construimos un parcial seguro a partir de 'full'
    // BP-S6 (Zod ERROR):
    console.warn("[BP-SLOTS7] Zod validation ERROR", err?.message, { full });


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
      if (typeof maybe.guestName === "string") p.guestName = maybe.guestName;
      if (typeof maybe.roomType === "string") p.roomType = maybe.roomType;
      if (typeof maybe.checkIn === "string") p.checkIn = maybe.checkIn;
      if (typeof maybe.checkOut === "string") p.checkOut = maybe.checkOut;
      if (Number.isFinite(maybe.numGuests)) p.numGuests = Number(maybe.numGuests);
      else if (Number.isFinite(maybe.guests)) p.numGuests = Number(maybe.guests);
      if (typeof maybe.locale === "string") p.locale = maybe.locale;
      partialFromModel = Object.keys(p ?? {}).length ? p : undefined;
    } catch { }

    const msgFromModel = questionAfterJson || "";
    const msg = msgFromModel || (typeof err?.message === "string"
      ? `Me falta un dato o hay un formato inválido: ${err.message}. ¿Podés confirmarlo?`
      : "Necesito validar datos: ¿podés confirmar nombre, tipo de habitación, huéspedes y fechas (YYYY-MM-DD)?");

    // Preferimos el parcial más completo
    const mergedPartial = { ...(partialFromModel ?? {}), ...partialFromFull };
    return {
      need: "question" as const,
      question: msg,
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
  const { roomType, numGuests } = slots;
  // Normalizar fechas a ISO datetime si vienen como YYYY-MM-DD
  function toIsoDatetime(dateStr?: string) {
    if (!dateStr) return undefined;
    // Si ya tiene T, asumimos que es datetime
    if (dateStr.includes('T')) return dateStr;
    // Si es YYYY-MM-DD, lo pasamos a YYYY-MM-DDT00:00:00Z
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr + 'T00:00:00Z';
    return dateStr;
  }
  const checkIn = toIsoDatetime(slots.checkIn);
  const checkOut = toIsoDatetime(slots.checkOut);
  console.debug('[askAvailability] called with:', { hotelId, roomType, numGuests, checkIn, checkOut });
  let res;
  try {
    res = await checkAvailabilityTool({
      hotelId,
      roomType,
      guests: numGuests,
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
    const lang2 = (slots.locale as any) === 'pt' ? 'pt' : (slots.locale as any) === 'en' ? 'en' : 'es';
    const showRt = localizeRoomType(option?.roomType || roomType, lang2 as any);
    return {
      ok: true as const,
      available: true as const,
      proposal:
        option
          ? `Tengo ${showRt} disponible. Tarifa por noche: ${option.pricePerNight ?? '—'} ${option.currency ?? ''}.`
          : `Hay disponibilidad para ${showRt}.`,
      options: (res.options ?? []) as AvailabilityOption[],
    };
  }

  const topAlternatives = (res.options ?? [])
    .map((o: AvailabilityOption) => o.roomType)
    .slice(0, 3)
    .join(', ');

  return {
    ok: true as const,
    available: false as const,
    proposal:
      res.options && res.options.length > 0
        ? `No tengo ${localizeRoomType(roomType, (slots.locale as any) === 'pt' ? 'pt' : (slots.locale as any) === 'en' ? 'en' : 'es')} en esas fechas, pero puedo ofrecer: ${topAlternatives}.`
        : `No tengo disponibilidad para ${localizeRoomType(roomType, (slots.locale as any) === 'pt' ? 'pt' : (slots.locale as any) === 'en' ? 'en' : 'es')} en esas fechas.`,
    options: (res.options ?? []) as AvailabilityOption[],
  };
}

export async function confirmAndCreate(hotelId: string, slots: ReservationSlots, channel: string = "web") {
  // Mapeo para tool legacy: guests
  const res = await createReservationTool({
    hotelId,
    guestName: slots.guestName!,
    roomType: slots.roomType!,
    guests: slots.numGuests!,
    checkIn: slots.checkIn!,
    checkOut: slots.checkOut!,
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
