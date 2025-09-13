// Path: /root/begasist/lib/agents/reservations.ts
import { ChatOpenAI } from "@langchain/openai";
import { reservationSlotsSchema, type ReservationSlots, validateBusinessRules } from "@/lib/schemas/reservation";
import {
  checkAvailabilityTool,
  createReservationTool,
  type CheckAvailabilityOutput,
} from "@/lib/tools/mcp";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export type FillSlotsResult =
  | { need: "question"; question: string; partial?: Partial<ReservationSlots> }
  | { need: "none"; slots: ReservationSlots };

type AvailabilityOption = NonNullable<CheckAvailabilityOutput["options"]>[number];

const MODEL_FOR_SLOTS = process.env.LLM_SLOTS_MODEL || process.env.LLM_DEFAULT_MODEL || "gpt-4o-mini";

const SLOTS_SYSTEM = `Sos un asistente de reservas de hotel.
Tu tarea es completar un JSON con los campos requeridos.
Si te falta información, NO inventes ni asumas “guests”.
Convertí fechas al formato ISO YYYY-MM-DD (sin hora).
Si te falta algo, devolvé UNA sola pregunta BREVE **y**, si podés, un JSON **parcial** solo con los campos seguros.
Si tenés todo, devolvé SOLO el JSON completo sin texto extra.`;

const SLOTS_USER_TEMPLATE = (userText: string, locale: string, hotelTz?: string) => `
Usuario: ${userText}

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
Si falta algún dato, devolvé SOLO una pregunta breve para el usuario (sin JSON).
Si está todo, devolvé SOLO el JSON correcto.

Contexto del sistema:
- Idioma esperado (ISO 639-1): ${locale}
- Timezone del hotel (opcional): ${hotelTz ?? "—"}`;

const JSON_BLOCK = /{[\s\S]*}/m;

export async function fillSlotsWithLLM(
  userText: string,
  localeIso6391: "es" | "en" | "pt",
  opts?: { hotelTz?: string }
): Promise<FillSlotsResult> {  const llm = new ChatOpenAI({ model: MODEL_FOR_SLOTS, temperature: 0.1 });
  // BP-S1 (antes de invocar al LLM):
  console.debug("[slots] prompt", {
      system: SLOTS_SYSTEM.slice(0,120) + "...",
      user: SLOTS_USER_TEMPLATE(userText, localeIso6391, opts?.hotelTz),
      model: MODEL_FOR_SLOTS,
    });

  const resp = await llm.invoke(
    [new SystemMessage(SLOTS_SYSTEM), 
     new HumanMessage(SLOTS_USER_TEMPLATE(userText, localeIso6391, opts?.hotelTz))] );
  const text = (resp.content as string) ?? "";
  // BP-S2 (raw response del LLM):
  console.debug("[slots] raw response", text);

  const jsonMatch = text.match(JSON_BLOCK);

  if (!jsonMatch) {

    const question = text.trim();
    // 🔎 heurísticas muy suaves para parciales
    const t = userText.toLowerCase();
    const partial: Partial<ReservationSlots> = {};
    if (/\b(simple|individual|single)\b/.test(t)) partial.roomType = "single";
    else if (/\b(doble|matrimonial|double|twin)\b/.test(t)) partial.roomType = "double";
    else if (/\b(triple)\b/.test(t)) partial.roomType = "triple";
    else if (/\b(suite)\b/.test(t)) partial.roomType = "suite";
    const mGuests = t.match(/\b(\d{1,2})\b/);
    if (mGuests) partial.guests = Math.max(1, Math.min(9, parseInt(mGuests[1],10)));
    const mIso = userText.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (mIso) partial.checkIn = mIso[0]; // (dejamos que el grafo decida si es in/out)
    // BP-S3 (cuando no hay JSON y devolvés pregunta):
    console.debug("[slots] no JSON -> question", { question, partial });

    return { need: "question", question: question || "Necesito un dato más…", partial };
   }

  // Intentamos parsear crudo para rescatar campos parciales si Zod falla
  let raw: any = {};
  try { raw = JSON.parse(jsonMatch![0]); 
    // BP-S4 (cuando hay JSONMatch, antes de Zod):
    console.debug("[slots] jsonMatch", jsonMatch[0]);
    console.debug("[slots] raw parsed", raw);

  } catch {}
  const full = {
    guestName: typeof raw?.guestName === "string" ? raw.guestName : undefined,
    roomType:  typeof raw?.roomType  === "string" ? raw.roomType  : undefined,
    guests:    typeof raw?.guests    === "number" ? raw.guests    : undefined,
    checkIn:   typeof raw?.checkIn   === "string" ? raw.checkIn   : undefined,
    checkOut:  typeof raw?.checkOut  === "string" ? raw.checkOut  : undefined,
    // 👇 mantenemos ISO 639-1
    locale:    typeof raw?.locale    === "string" ? raw.locale    : localeIso6391,
  };

  try {
    const parsed = reservationSlotsSchema.parse(full);
    
    validateBusinessRules(parsed, localeIso6391, opts?.hotelTz);
    
    // BP-S5 (slots parseados OK por Zod):
    console.debug("[slots] Zod OK -> parsed", parsed);


    return { need: "none" as const, slots: parsed as ReservationSlots };
  } catch (err: any) {
    // Construimos un parcial seguro a partir de 'full'
    // BP-S6 (Zod ERROR):
    console.warn("[slots] Zod ERROR", err?.message, { full });


    const partialFromFull: Partial<ReservationSlots> = {};
    if (full.guestName) partialFromFull.guestName = full.guestName;
    if (full.roomType)  partialFromFull.roomType  = full.roomType;
    if (typeof full.guests === "number" && full.guests > 0) partialFromFull.guests = full.guests;
    if (full.checkIn)   partialFromFull.checkIn   = full.checkIn;
    if (full.checkOut)  partialFromFull.checkOut  = full.checkOut;
    partialFromFull.locale = localeIso6391;

    // Intento adicional: si el modelo devolvió JSON parcial en 'jsonMatch[0]'
    let partialFromModel: Partial<ReservationSlots> | undefined;
    try {
      const maybe = JSON.parse(jsonMatch![0]); // ya garantizado por el return previo
      const p: Partial<ReservationSlots> = {};
      if (typeof maybe.guestName === "string") p.guestName = maybe.guestName;
      if (typeof maybe.roomType === "string")  p.roomType  = maybe.roomType;
      if (typeof maybe.checkIn === "string")   p.checkIn   = maybe.checkIn;
      if (typeof maybe.checkOut === "string")  p.checkOut  = maybe.checkOut;
      if (Number.isFinite(maybe.guests))       p.guests    = Number(maybe.guests);
      if (typeof maybe.locale === "string")    p.locale    = maybe.locale;
      partialFromModel = Object.keys(p ?? {}).length ? p : undefined;
    } catch {}

    const msg = typeof err?.message === "string"
      ? `Me falta un dato o hay un formato inválido: ${err.message}. ¿Podés confirmarlo?`
      : "Necesito validar datos: ¿podés confirmar nombre, tipo de habitación, huéspedes y fechas (YYYY-MM-DD)?";

    // Preferimos el parcial más completo
    const mergedPartial = { ...(partialFromModel ?? {}), ...partialFromFull };
    return {
      need: "question" as const,
      question: msg,
      partial: Object.keys(mergedPartial).length ? mergedPartial : undefined,
    };
  }
}

export async function askAvailability(hotelId: string, slots: ReservationSlots) {
  const { roomType, guests, checkIn, checkOut } = slots;
  const res = await checkAvailabilityTool({
    hotelId,
    roomType,
    guests,
    checkIn,
    checkOut,
  });

  if (!res.ok) {
    return {
      ok: false as const,
      message:
        res.error ??
        "No pude consultar la disponibilidad en este momento. Un recepcionista revisará tu solicitud.",
    };
  }

  if (res.available) {
    const option: AvailabilityOption | undefined = res.options?.[0];
    return {
      ok: true as const,
      available: true as const,
      proposal:
        option
          ? `Tengo ${option.roomType} disponible. Tarifa por noche: ${option.pricePerNight ?? "—"} ${option.currency ?? ""}.`
          : `Hay disponibilidad para ${roomType}.`,
      options: (res.options ?? []) as AvailabilityOption[],
    };
  }

  const topAlternatives = (res.options ?? [])
    .map((o: AvailabilityOption) => o.roomType)
    .slice(0, 3)
    .join(", ");

  return {
    ok: true as const,
    available: false as const,
    proposal:
      res.options && res.options.length > 0
        ? `No tengo ${roomType} en esas fechas, pero puedo ofrecer: ${topAlternatives}.`
        : `No tengo disponibilidad para ${roomType} en esas fechas.`,
    options: (res.options ?? []) as AvailabilityOption[],
  };
}

export async function confirmAndCreate(hotelId: string, slots: ReservationSlots, channel: string = "web") {
  const res = await createReservationTool({
    hotelId,
    guestName: slots.guestName!,
    roomType: slots.roomType!,
    guests: slots.guests!,
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
