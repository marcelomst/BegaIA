// Path: /root/begasist/lib/prompts/hotelAssistantStructuredPrompt.ts

import { z } from "zod";
import { ChatPromptTemplate } from "@langchain/core/prompts";

/**
 * Esquema de salida estructurada para respuestas del asistente hotelero.
 * - "answer": respuesta natural para el huésped.
 * - "intent": intención detectada (ejemplos comunes).
 * - "entities": datos extraídos clave para operar (fechas, huéspedes, etc.).
 * - "actions": pasos sugeridos para el sistema/recepcionista.
 * - "handoff": true si se debe escalar a humano.
 * - "missing_fields": qué falta pedir para completar la gestión.
 * - "language": confirmación del idioma de salida.
 */
export const hotelAssistantSchema = z.object({
  answer: z.string().describe("Respuesta final al usuario en lenguaje natural."),
  intent: z
    .enum([
      "general_question",
      "reservation_inquiry",
      "checkin_info",
      "checkout_info",
      "amenities_info",
      "pricing_request",
      "cancellation_policy",
      "location_directions",
      "out_of_scope"
    ])
    .describe("Intención principal inferida."),
  entities: z
    .object({
      checkin_date: z.string().optional().describe("Fecha de check-in en ISO-8601 si se menciona."),
      checkout_date: z.string().optional().describe("Fecha de check-out en ISO-8601 si se menciona."),
      guests: z.number().optional().describe("Cantidad de huéspedes si se menciona."),
      room_type: z.string().optional().describe("Tipo de habitación si se menciona."),
      channel: z.string().optional().describe("Canal de origen (web, whatsapp, email) si aplica."),
    })
    .describe("Entidades relevantes detectadas."),
  actions: z
    .array(
      z.object({
        type: z
          .enum([
            "collect_missing_info",
            "create_reservation_draft",
            "send_policy_info",
            "notify_reception",
            "no_action"
          ])
          .describe("Tipo de acción sugerida."),
        detail: z.string().describe("Detalle textual para logs / operator."),
      })
    )
    .min(1)
    .describe("Acciones recomendadas tras analizar la consulta."),
  handoff: z.boolean().describe("true si debe intervenir un humano."),
  missing_fields: z
    .array(
      z.enum(["checkin_date", "checkout_date", "guests", "room_type", "contact"])
    )
    .describe("Campos que faltan para completar la gestión."),
  language: z.enum(["es", "en", "pt"]).describe("Idioma usado en la respuesta.")
});

// Ya no se necesita hotelAssistantParser, se usará .withStructuredOutput()

/**
 * Prompt base con instrucciones + formatInstructions del parser.
 * Variables:
 *  - lang: "es" | "en" | "pt"
 *  - hotelName
 *  - hotelAddress
 *  - services (string corto o bullets)
 *  - channel ("web" | "whatsapp" | "email" | otro)
 *  - userQuery (mensaje del usuario)
 */
export const hotelAssistantStructuredPrompt = ChatPromptTemplate.fromTemplate(`
Eres un asistente virtual de un hotel.
Debes responder SIEMPRE en el idioma: {lang}.
Sé cordial, breve y profesional. No inventes datos.

Contexto del hotel:
- Nombre: {hotelName}
- Dirección: {hotelAddress}
- Servicios: {services}

Reglas del dominio:
- Si el usuario consulta por reservas, solicita (si faltan): fechas (check-in y check-out), cantidad de huéspedes y tipo de habitación.
- En check-in/check-out, informa horarios y requisitos conocidos.
- En amenities/servicios, responde con lo disponible en el contexto.
- Si el usuario solicita MODIFICAR una reserva (borrador o confirmada):
  - NUNCA derives ni sugieras contactar al hotel por ningún medio externo (teléfono, WhatsApp, email, etc.).
  - Gestiona la modificación conversacionalmente, paso a paso, incluso si handoff=true.
  - Primero pregunta explícitamente: "¿Qué dato de tu reserva te gustaría modificar? (fechas, habitación, huéspedes, nombre, etc.)" y espera la respuesta.
  - Cuando el usuario indique el campo, solicita el nuevo valor: "Por favor, dime el nuevo valor para [campo]." y espera la respuesta.
  - Una vez recibido el nuevo valor, confirma la actualización: "He actualizado tu reserva con el nuevo [campo]: [valor]. ¿Quieres modificar otro dato o finalizar la modificación? Si no, te mostraré el resumen actualizado."
  - Si el usuario dice que no quiere modificar más, muestra el resumen actualizado de la reserva con todos los datos actuales.
  - Permite modificar más de un campo en el mismo flujo si el usuario lo solicita.
- Si no hay información suficiente o es un caso operacional (precio final, políticas personalizadas, gestión compleja), marca "handoff": true y sugiere "notify_reception" (excepto para modificaciones de reservas, que siempre debes gestionar tú mismo).
- Si la consulta está fuera del dominio hotelero, clasifica "intent": "out_of_scope", responde con cortesía y no inventes.

Formato de salida:
{format_instructions}

Canal: {channel}
Usuario: {userQuery}
`);

/**
 * Helper para construir el mensaje final (con las instrucciones del parser embebidas).
 */
export function buildHotelAssistantStructuredPrompt(vars: {
  lang: "es" | "en" | "pt";
  hotelName: string;
  hotelAddress: string;
  services: string;
  channel: string;
  userQuery: string;
}) {
  const formatInstructions = `Responde solo en JSON válido con la siguiente estructura: { answer: string, intent: string, entities: object, actions: array, handoff: boolean, missing_fields: array, language: string }`;
  return hotelAssistantStructuredPrompt.format({
    ...vars,
    format_instructions: formatInstructions,
  });
}

/**
 * Ejemplo de uso con LangChain:
 *
 * import { ChatOpenAI } from "@langchain/openai";
 *
 * const model = new ChatOpenAI({
 *   model: "gpt-4o-mini", // o el que uses en producción
 *   temperature: 0.2,
 * });
 *
 * const vars = {
 *   lang: "es",
 *   hotelName: "Hotel Río del Sol",
 *   hotelAddress: "Av. Costanera 123, Ciudad",
 *   services: "- WiFi\n- Piscina\n- Desayuno buffet",
 *   channel: "web",
 *   userQuery: "Hola, ¿tienen disponibilidad del 12 al 15 de octubre para 2 adultos?"
 * };
 *
 * // 1) Construir el prompt con las instrucciones del parser:
 * const messages = await hotelAssistantStructuredPrompt.formatMessages({
 *   ...vars,
 *   format_instructions: hotelAssistantParser.getFormatInstructions(),
 * });
 *
 * // 2) Ejecutar el modelo:
 * const aiMsg = await model.invoke(messages);
 *
 * // 3) Parsear a JSON tipado:
 * const structured = await hotelAssistantParser.parse(aiMsg.content);
 * console.log(structured);
 *
 * // structured.answer → respuesta para el huésped
 * // structured.intent → "reservation_inquiry", etc.
 * // structured.entities → checkin/checkout/guests, etc.
 * // structured.actions → guía para el backend/recepción
 * // structured.handoff → si debe intervenir humano
 * // structured.missing_fields → qué falta pedir
 * // structured.language → confirmación del idioma
 */
