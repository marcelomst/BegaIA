// Path: /root/begasist/lib/agents/reservations.ts
import { ChatOpenAI } from "@langchain/openai";
import { reservationSlotsSchema, type ReservationSlots, validateBusinessRules } from "@/lib/schemas/reservation";
import {
  checkAvailabilityTool,
  createReservationTool,
  type CheckAvailabilityOutput,
} from "@/lib/tools/mcp";

// Tipo auxiliar: un elemento de la lista de opciones de disponibilidad
type AvailabilityOption = NonNullable<CheckAvailabilityOutput["options"]>[number];

const MODEL_FOR_SLOTS = process.env.LLM_SLOTS_MODEL || "gpt-4o-mini";

const SLOTS_SYSTEM = `Sos un asistente de reservas de hotel.
Tu tarea es completar un JSON con los campos requeridos.
Si te falta información, NO inventes. Pregunta UNA sola cosa que falte, de forma breve.
Si tenés todo, devolvé SOLO el JSON sin texto extra.`;

const SLOTS_USER_TEMPLATE = (userText: string, locale: string) => `
Usuario: ${userText}

Requisitos JSON:
{
  "guestName": string,
  "roomType": string,
  "guests": number,
  "checkIn": ISO8601 string,
  "checkOut": ISO8601 string,
  "locale": ISO 639-3 string
}

Importante:
- "locale" debe ser exactamente un código ISO 639-3 (ej: "spa", "eng", "por").
- Normalizá "roomType" (ej: "doble", "doble matrimonial" => "double"; "simple" => "single"; "suite" => "suite").
- NO uses HTML ni saltos dobles.

Si falta algún dato, devolvé SOLO una pregunta breve para el usuario (sin JSON).
Si está todo, devolvé SOLO el JSON correcto.

Contexto del sistema:
- Idioma esperado (ISO 639-3): ${locale}
`;

const JSON_BLOCK = /{[\s\S]*}/m;

export async function fillSlotsWithLLM(userText: string, localeIso6393: string) {
  const llm = new ChatOpenAI({ model: MODEL_FOR_SLOTS, temperature: 0.1 });
  const prompt = [
    { role: "system" as const, content: SLOTS_SYSTEM },
    { role: "user" as const, content: SLOTS_USER_TEMPLATE(userText, localeIso6393) },
  ];
  const resp = await llm.invoke(prompt);
  const text = (resp.content as string) ?? "";
  const jsonMatch = text.match(JSON_BLOCK);

  if (!jsonMatch) {
    const question = text.trim();
    return {
      need: "question" as const,
      question:
        question ||
        "Necesito un dato más para continuar: ¿Cuál es tu nombre completo y las fechas exactas de check-in y check-out?",
    };
  }

  try {
    const parsed = reservationSlotsSchema.parse(JSON.parse(jsonMatch[0]));
    validateBusinessRules(parsed);
    return { need: "none" as const, slots: parsed as ReservationSlots };
  } catch (err: any) {
    return {
      need: "question" as const,
      question:
        typeof err?.message === "string"
          ? `Me falta un dato o hay un formato inválido: ${err.message}. ¿Podés confirmarlo?`
          : "Necesito validar datos: ¿podés confirmar nombre, tipo de habitación, huéspedes y fechas en formato ISO (YYYY-MM-DD)?",
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

  // No disponible: devolver alternativas si existen
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
