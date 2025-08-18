// Path: /root/begasist/lib/handlers/messageHandler.ts

import type { ChannelMessage } from "@/types/channel";
import { saveMessageToAstra } from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { getMessagesByConversation } from "@/lib/services/messages";
import crypto from "crypto";

/** Util: normalizar a minúsculas y sin tildes para matching */
function norm(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Heurística: ¿parece un nombre suelto (fallback muy estricto)? */
function isLikelyNameCandidate(text: string): boolean {
  const s = (text || "").trim();
  if (s.length < 2 || s.length > 80) return false;

  // stopwords para evitar tomar intenciones como “quiero reservar…”
  const STOPWORDS = [
    "quiero","reserv","habitac","consulta","pregunta",
    "hola","buenos","buenas","necesito","cotiz","precio","tarif",
    "fecha","check","in","out","room"
  ];
  const low = s.toLowerCase();
  if (STOPWORDS.some(w => low.includes(w))) return false;

  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length < 2 || parts.length > 4) return false;

  const CONNECTORS = ["de","del","la","las","los","san","santa"];
  return parts.every(p =>
    CONNECTORS.includes(p.toLowerCase()) ||
    /^[A-Za-zÁÉÍÓÚÑáéíóúÜü'-]{2,}$/.test(p)
  );
}

/** Corta citas inline y bloque '>' */
function cutInlineQuotes(input: string): string {
  if (!input) return "";
  const markers: RegExp[] = [
    /\bEl\s+.+\sescribi[oó]:/i,
    /\bOn\s+.+\swrote:/i,
    /-{2,}\s*Original Message\s*-{2,}/i,
    /-{2,}\s*Mensaje reenviado\s*-{2,}/i,
  ];
  let cutAt = -1;
  for (const re of markers) {
    const m = re.exec(input);
    if (m && (cutAt === -1 || m.index < cutAt)) cutAt = m.index;
  }
  let s = (cutAt >= 0 ? input.slice(0, cutAt) : input);
  s = s
    .split(/\r?\n/)
    .reduce<{ out: string[]; stop: boolean }>((acc, line) => {
      if (acc.stop) return acc;
      if (/^\s*>/.test(line)) { acc.stop = true; return acc; }
      if (/^\s*(From|De|Para|To|Asunto|Subject|Cc|Bcc):/i.test(line)) { acc.stop = true; return acc; }
      acc.out.push(line);
      return acc;
    }, { out: [], stop: false }).out
    .join("\n");
  return s.trim();
}

/** Extrae nombre: retorna { name, highConfidence } */
function extractNameFromText(text: string): { name: string | null; highConfidence: boolean } {
  if (!text) return { name: null, highConfidence: false };
  const t = cutInlineQuotes(text);

  // Alta confianza (frases explícitas)
  const patterns = [
    /\bmi\s+nombre(?:\s+es)?\s+([A-Za-zÁÉÍÓÚÑáéíóúÜü' .-]{2,80})\b/iu,
    /\bme\s+llamo\s+([A-Za-zÁÉÍÓÚÑáéíóúÜü' .-]{2,80})\b/iu,
    /\bsoy\s+([A-Za-zÁÉÍÓÚÑáéíóúÜü' .-]{2,80})\b/iu,
    /\bmy\s+name\s+is\s+([A-Za-zÁÉÍÓÚÑáéíóúÜü' .-]{2,80})\b/iu,
    /\bi\s+am\s+([A-Za-zÁÉÍÓÚÑáéíóúÜü' .-]{2,80})\b/iu,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m?.[1]) return { name: m[1].trim(), highConfidence: true };
  }

  // Baja confianza (fallback estricto)
  if (isLikelyNameCandidate(t)) {
    return { name: t.trim(), highConfidence: false };
  }

  return { name: null, highConfidence: false };
}

function titleCaseName(text: string): string {
  return (text || "")
    .trim()
    .toLowerCase()
    .replace(/\b([a-záéíóúñü])/g, (m) => m.toUpperCase())
    .replace(/\s+/g, " ");
}

/** Detecta si un texto es el checklist genérico del bot (para filtrarlo/evitar eco) */
function isGenericChecklist(text: string): boolean {
  const t = (text || "").toLowerCase();
  const hasLeadPhrase =
    t.includes("para avanzar con tu reserva necesito") ||
    t.includes("para continuar necesito") ||
    t.includes("para proceder necesito") ||
    t.includes("to proceed i need") ||
    t.includes("to continue i need");

  const mentionsName =
    t.includes("nombre del huésped") || /\bnombre\b/.test(t) || /\bname\b/.test(t);

  const mentionsRoom =
    t.includes("tipo de habitación") || t.includes("room type") || t.includes("habitación");

  const mentionsCheckIn =
    t.includes("check-in") || t.includes("check in") || t.includes("fecha de check-in");

  const mentionsCheckOut =
    t.includes("check-out") || t.includes("check out") || t.includes("fecha de check-out");

  const count = [mentionsName, mentionsRoom, mentionsCheckIn && mentionsCheckOut].filter(Boolean).length;
  return (hasLeadPhrase && count >= 2) || (mentionsName && (mentionsCheckIn || mentionsCheckOut));
}

function asksForName(text: string): boolean {
  const t = (text || "").toLowerCase();
  return /\bnombre\b/.test(t) || /\bname\b/.test(t) || t.includes("nombre del huésped");
}
function asksForRoomType(text: string): boolean {
  const t = (text || "").toLowerCase();
  return t.includes("tipo de habitación") || t.includes("room type");
}
function asksForDates(text: string): { askCheckIn: boolean; askCheckOut: boolean } {
  const t = (text || "").toLowerCase();
  const askCheckIn = t.includes("check-in") || t.includes("check in") || t.includes("fecha de check-in");
  const askCheckOut = t.includes("check-out") || t.includes("check out") || t.includes("fecha de check-out");
  return { askCheckIn, askCheckOut };
}

/** Extrae room type desde texto libre (ES/EN) */
function extractRoomTypeFromText(text: string): { roomType: string | null; highConfidence: boolean } {
  if (!text) return { roomType: null, highConfidence: false };
  const s = norm(cutInlineQuotes(text));

  const checks: Array<[RegExp, string]> = [
    [/\b(junior\s+suite)\b/, "junior suite"],
    [/\b(master\s+suite)\b/, "master suite"],
    [/\b(suite)\b/, "suite"],
    [/\b(king)\b/, "king"],
    [/\b(queen)\b/, "queen"],
    [/\b(twin)\b/, "twin"],
    [/\b(triple)\b/, "triple"],
    [/\b(cuadruple|cu[aá]druple|quad)\b/, "cuadruple"],
    [/\b(familiar)\b/, "familiar"],
    [/\b(single|sencilla|individual)\b/, "single"],
    [/\b(doble|matrimon(?:ial)?)\b/, "doble"],
    [/\b(standard|estandar)\b/, "standard"],
    [/\b(deluxe)\b/, "deluxe"],
    [/\b(superior)\b/, "superior"],
    [/\b(hab(?:itacion)?\s+doble|room\s+double)\b/, "doble"],
  ];

  for (const [re, label] of checks) {
    if (re.test(s)) return { roomType: label, highConfidence: true };
  }
  return { roomType: null, highConfidence: false };
}

/** Extrae fechas simples (dd/mm[/aaaa] o dd-mm) del texto. Toma las 2 primeras como check-in y check-out. */
function extractDatesFromText(text: string): { checkIn: string | null; checkOut: string | null } {
  if (!text) return { checkIn: null, checkOut: null };
  const s = cutInlineQuotes(text);
  const re = /\b(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\b/g;
  const found: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) && found.length < 2) {
    found.push(m[1]);
  }
  return {
    checkIn: found[0] || null,
    checkOut: found[1] || null,
  };
}

/** Recorre el historial (HumanMessage) para acumular últimos slots mencionados */
function accumulateSlotsFromHistory(history: Array<HumanMessage | AIMessage>) {
  let roomType: string | null = null;
  let checkIn: string | null = null;
  let checkOut: string | null = null;

  for (const msg of history) {
    if (msg instanceof HumanMessage) {
      const txt = msg.content?.toString?.() ?? String(msg.content ?? "");
      const { roomType: rt } = extractRoomTypeFromText(txt);
      const { checkIn: ci, checkOut: co } = extractDatesFromText(txt);
      if (rt) roomType = rt;
      if (ci) checkIn = ci;
      if (co) checkOut = co;
    }
  }
  return { roomType, checkIn, checkOut };
}

/** Busca el último "borrador" anunciado por el bot y regresa su reservationId si lo encuentra */
function findLastDraftId(history: Array<HumanMessage | AIMessage>): string | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i];
    if (msg instanceof AIMessage) {
      const text = String(msg.content ?? "");
      const m = text.match(/(?:Borrador de reserva|Reservation draft)\s*#\s*([A-Za-z0-9-]+)/i);
      if (m?.[1]) return m[1];
      const m2 = text.match(/\bRES-(?:[A-Z0-9]{6,})\b/);
      if (m2?.[0]) return m2[0];
    }
  }
  return null;
}

/** Detecta intención de confirmación/cancelación y, si corresponde, el id */
function detectConfirmationIntent(text: string, fallbackId?: string | null) {
  const t = norm(cutInlineQuotes(text));
  const confirm = /\b(confirmar|confirmo|si confirmo|ok|de acuerdo|listo|procede|proseguir)\b/i.test(t);
  const cancel = /\b(cancelar|anular|no|detener|parar)\b/i.test(t);
  const m = t.match(/\b(?:res(?:erva)?\s*#?\s*|id\s*#?\s*|r[-_ ]?)?([a-z0-9-]{8,})\b/i);
  let id: string | null = null;
  if (m?.[1]) id = m[1];
  if (!id && fallbackId) id = fallbackId;
  return { confirm, cancel, id };
}

/** Deriva slots mínimos para reserva, aceptando descubrimientos del historial + mensaje actual */
function deriveReservationState(
  knownName?: string | null,
  base?: { roomType?: string | null; checkIn?: string | null; checkOut?: string | null },
  overrides?: { roomType?: string | null; checkIn?: string | null; checkOut?: string | null }
) {
  const state = {
    name: knownName?.trim() || null,
    roomType: overrides?.roomType ?? base?.roomType ?? null,
    checkIn: overrides?.checkIn ?? base?.checkIn ?? null,
    checkOut: overrides?.checkOut ?? base?.checkOut ?? null,
  };
  const missing = [
    !state.roomType && "room type",
    !state.checkIn && "check-in date",
    !state.checkOut && "check-out date",
  ].filter(Boolean) as string[];
  return { state, missing };
}

/** Formatea el texto de borrador */
function formatDraftMessage(lang: string, state: { name: string | null; roomType: string | null; checkIn: string | null; checkOut: string | null }, reservationId: string) {
  const linesEs = [
    `📝 Borrador de reserva #${reservationId}`,
    state.name ? `• Huésped: ${state.name}` : undefined,
    state.roomType ? `• Tipo: ${state.roomType}` : undefined,
    state.checkIn ? `• Check-in: ${state.checkIn}` : undefined,
    state.checkOut ? `• Check-out: ${state.checkOut}` : undefined,
    "",
    `¿Confirmás la reserva? Respondé "CONFIRMAR ${reservationId}" o "CORREGIR ${reservationId}" indicando los cambios.`,
  ].filter(Boolean) as string[];

  const linesEn = [
    `📝 Reservation draft #${reservationId}`,
    state.name ? `• Guest: ${state.name}` : undefined,
    state.roomType ? `• Room: ${state.roomType}` : undefined,
    state.checkIn ? `• Check-in: ${state.checkIn}` : undefined,
    state.checkOut ? `• Check-out: ${state.checkOut}` : undefined,
    "",
    `Do you confirm? Reply "CONFIRM ${reservationId}" or "EDIT ${reservationId}" with your changes.`,
  ].filter(Boolean) as string[];

  return (lang.startsWith("es") ? linesEs : linesEn).join("\n");
}

/** Respuesta determinista amigable con slots faltantes */
function deterministicReply(lang: string, state: { name: string | null }, missing: string[]): string {
  const needs = missing.map(m => {
    if (m === "room type") return lang.startsWith("es") ? "tipo de habitación" : "room type";
    if (m === "check-in date") return lang.startsWith("es") ? "fecha de check-in" : "check-in date";
    if (m === "check-out date") return lang.startsWith("es") ? "fecha de check-out" : "check-out date";
    return m;
  });

  const list =
    needs.length === 1
      ? needs[0]
      : needs.slice(0, -1).join(lang.startsWith("es") ? ", " : ", ") +
        (lang.startsWith("es") ? " y " : " and ") +
        needs.slice(-1);

  const greet = state.name ? `${state.name}, ` : "";

  return lang.startsWith("es")
    ? `${greet}perfecto. Para continuar necesito ${list}.`
    : `${greet}great. To continue I need your ${list}.`;
}

/** Stub: integración Channel Manager (más adelante lo movemos a /lib/handlers/channelManagerAdapter.ts) */
async function createReservationInChannelManager(_hotelId: string, payload: {
  guestName: string, roomType: string, checkIn: string, checkOut: string
}): Promise<{ ok: boolean; locator?: string; raw?: any }> {
  // TODO: reemplazar por el adapter real (SiteMinder / CM que uses)
  console.log("➡️ [CM] Enviando pre-reserva al Channel Manager con payload:", payload);
  // simulamos un localizador
  const locator = "CM-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  return { ok: true, locator, raw: { simulated: true } };
}

export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    autoReply?: boolean;
    sendReply?: (reply: string) => Promise<void>;
    mode?: "automatic" | "supervised";
  }
): Promise<void> {
  if (!msg.content || !msg.sender) {
    msg.status = "ignored";
    msg.role = "user";
    await saveMessageToAstra(msg);
    channelMemory.addMessage(msg);
    return;
  }

  // IDs/roles por defecto
  msg.messageId = msg.messageId || crypto.randomUUID();
  msg.role = msg.role || "user";

  const now = new Date().toISOString();
  const guestId = msg.guestId ?? msg.sender;

  // --- GUEST ---
  let guest = await getGuest(msg.hotelId, guestId);
  if (!guest) {
    guest = {
      guestId,
      hotelId: msg.hotelId,
      name: "",
      mode: options?.mode ?? "automatic",
      createdAt: now,
      updatedAt: now,
    };
    await createGuest(guest);
    console.log(`👤 Guest creado: ${guestId}`);
  } else {
    await updateGuest(msg.hotelId, guestId, { updatedAt: now });
  }
  console.log("👤 Guest snapshot:", { guestId, nameInDB: guest?.name });

  // 🧠 Nombre: detectar/actualizar con política de confianza
  const extractedName = extractNameFromText(msg.content);
  if (extractedName.name) {
    const prettyName = titleCaseName(extractedName.name);
    const mayOverwrite = extractedName.highConfidence || !guest.name;
    if (mayOverwrite && guest.name !== prettyName) {
      try {
        await updateGuest(msg.hotelId, guestId, { name: prettyName, updatedAt: now });
        guest.name = prettyName;
        console.log(
          `📝 Nombre ${extractedName.highConfidence ? "alta-confianza" : "baja-confianza"} guardado para ${guestId}: ${prettyName}`
        );
      } catch (e) {
        console.warn("⚠️ No se pudo actualizar el nombre del guest:", e);
      }
    } else if (!extractedName.highConfidence) {
      console.log(
        `ℹ️ Nombre detectado "${prettyName}" NO sobreescribe el existente "${guest.name}" (baja confianza).`
      );
    }
  }

  // --- CONVERSACIÓN ---
  const conversationId = `${msg.hotelId}-${msg.channel}-${guestId}`;
  await getOrCreateConversation({
    conversationId,
    hotelId: msg.hotelId,
    guestId,
    channel: msg.channel,
    startedAt: now,
    lastUpdatedAt: now,
    status: "active",
    subject: "",
  });
  msg.conversationId = conversationId;
  msg.guestId = guestId;

  // --- GUARDAR MENSAJE DE USUARIO ---
  await saveMessageToAstra(msg);
  channelMemory.addMessage(msg);

  // --- IA / LÓGICA ---
  if (options?.sendReply) {
    const lang = (msg.detectedLanguage || "en").toLowerCase();
    const knownName = guest?.name?.trim();

    // 1) Historial (incluye el mensaje actual)
    let lcHistory: Array<HumanMessage | AIMessage> = [];
    try {
      const history = await getMessagesByConversation(msg.hotelId, msg.channel, msg.conversationId!);
      const last = Array.isArray(history) ? history.slice(-8) : [];
      lcHistory = last
        .map((h: any) => {
          let text = (h.content ?? h.suggestion ?? "").trim();
          if (!text) return null;
          text = cutInlineQuotes(text);
          if (!text) return null;
          if (h.sender === "assistant" && isGenericChecklist(text)) return null;
          const isAssistant = h.sender === "assistant" || h.role === "ai";
          return isAssistant ? new AIMessage(text) : new HumanMessage(text);
        })
        .filter(Boolean) as Array<HumanMessage | AIMessage>;
    } catch {
      lcHistory = [];
    }

    // 2) Último borrador (si existe)
    const lastDraftId = findLastDraftId(lcHistory);

    // 3) Intención de confirmación/cancelación
    const { confirm, cancel, id: idInMsg } = detectConfirmationIntent(msg.content, lastDraftId);

    // 4) Slots desde HISTORIAL
    const histSlots = accumulateSlotsFromHistory(lcHistory);

    // 5) Slots desde el MENSAJE ACTUAL
    const { roomType: rtNow } = extractRoomTypeFromText(msg.content);
    const { checkIn: ciNow, checkOut: coNow } = extractDatesFromText(msg.content);

    // 6) Unimos: prevalece lo del mensaje actual sobre historial
    const overrides = {
      roomType: rtNow ?? histSlots.roomType,
      checkIn: ciNow ?? histSlots.checkIn,
      checkOut: coNow ?? histSlots.checkOut
    };

    // 7) Derivamos estado final
    const { state, missing } = deriveReservationState(knownName, histSlots, overrides);
    console.log("🧩 Slots → known:", state, " missing:", missing);

    // 8) Si hay confirmación y tenemos un borrador reciente y NO faltan campos → confirmar
    if (confirm && idInMsg && !missing.length && state.name && state.roomType && state.checkIn && state.checkOut) {
      const payload = {
        guestName: state.name,
        roomType: state.roomType,
        checkIn: state.checkIn,
        checkOut: state.checkOut,
      };
      const cm = await createReservationInChannelManager(msg.hotelId, payload);
      const confirmText = lang.startsWith("es")
        ? (cm.ok
            ? `✅ Reserva confirmada. Localizador: ${cm.locator}. ¡Gracias!`
            : `⚠️ Tu reserva quedó registrada como pre-reserva. Un recepcionista la confirmará a la brevedad.`)
        : (cm.ok
            ? `✅ Booking confirmed. Locator: ${cm.locator}. Thank you!`
            : `⚠️ Your booking is pre-registered. A receptionist will confirm shortly.`);
      const aiMsg: ChannelMessage = {
        ...msg,
        messageId: crypto.randomUUID(),
        sender: "assistant",
        content: confirmText,
        suggestion: confirmText,
        role: "ai",
        status: options.mode === "automatic" ? "sent" : "pending",
        timestamp: new Date().toISOString(),
        reservationId: idInMsg,
      };
      await saveMessageToAstra(aiMsg);
      channelMemory.addMessage(aiMsg);
      if (options.mode === "automatic") await options.sendReply(confirmText);
      else await options.sendReply(lang.startsWith("es")
        ? "🕓 Tu confirmación fue recibida y será validada por un recepcionista."
        : "🕓 Your confirmation was received and will be validated by a receptionist.");
      return;
    }

    // 9) Si pide cancelar
    if (cancel && idInMsg) {
      const cancelText = lang.startsWith("es")
        ? `❎ Se canceló el borrador de reserva #${idInMsg}. ¿Querés que empecemos de nuevo?`
        : `❎ Reservation draft #${idInMsg} cancelled. Do you want to start over?`;
      const aiMsg: ChannelMessage = {
        ...msg,
        messageId: crypto.randomUUID(),
        sender: "assistant",
        content: cancelText,
        suggestion: cancelText,
        role: "ai",
        status: options.mode === "automatic" ? "sent" : "pending",
        timestamp: new Date().toISOString(),
        reservationId: idInMsg,
      };
      await saveMessageToAstra(aiMsg);
      channelMemory.addMessage(aiMsg);
      if (options.mode === "automatic") await options.sendReply(cancelText);
      else await options.sendReply(lang.startsWith("es")
        ? "🕓 Tu solicitud será gestionada por un recepcionista."
        : "🕓 Your request will be handled by a receptionist.");
      return;
    }

    // 10) Si NO faltan campos → emitir BORRADOR y pedir confirmación
    if (!missing.length && state.name && state.roomType && state.checkIn && state.checkOut) {
      const reservationId = idInMsg || ("RES-" + crypto.randomUUID().slice(0, 8).toUpperCase());
      const draftText = formatDraftMessage(lang, state, reservationId);
      const aiMsg: ChannelMessage = {
        ...msg,
        messageId: crypto.randomUUID(),
        sender: "assistant",
        content: draftText,
        suggestion: draftText,
        role: "ai",
        status: options.mode === "automatic" ? "sent" : "pending",
        timestamp: new Date().toISOString(),
        reservationId,
      };
      await saveMessageToAstra(aiMsg);
      channelMemory.addMessage(aiMsg);
      if (options.mode === "automatic") await options.sendReply(draftText);
      else await options.sendReply(lang.startsWith("es")
        ? "🕓 Tu borrador fue generado y será revisado por un recepcionista."
        : "🕓 Your draft was generated and will be reviewed by a receptionist.");
      return;
    }

    // 11) Si aún faltan campos → generamos respuesta con LLM (con guardrails)
    //    (reutilizamos prompt fuerte que ya tenías)
    const knownSummary =
      `Known fields: name=${state.name ?? "unknown"}, roomType=${state.roomType ?? "unknown"}, ` +
      `checkIn=${state.checkIn ?? "unknown"}, checkOut=${state.checkOut ?? "unknown"}.`;
    const missingSummary = `Missing fields: ${missing.join(", ") || "none"}.`;

    const systemMsgText =
      `You are a hotel front-desk assistant. Reply in ${lang}. ` +
      (state.name ? `The guest name is "${state.name}". Greet them by name and DO NOT ask for the name again. ` : "") +
      (state.roomType ? `The room type is "${state.roomType}". Do NOT ask for room type again. ` : "") +
      (state.checkIn ? `The check-in date is "${state.checkIn}". Do NOT ask for it again. ` : "") +
      (state.checkOut ? `The check-out date is "${state.checkOut}". Do NOT ask for it again. ` : "") +
      `Use slot-filling: ask ONLY for the missing fields, in one short sentence. ` +
      `Do NOT include the phrase "Para avanzar con tu reserva necesito" nor repeat the full checklist if some fields are already known. ` +
      `${knownSummary} ${missingSummary}`;

    let suggestion = "";
    const response = await agentGraph.invoke({
      hotelId: msg.hotelId,
      conversationId: msg.conversationId,
      detectedLanguage: msg.detectedLanguage,
      messages: [new SystemMessage(systemMsgText), ...lcHistory],
    });
    const content = response.messages.at(-1)?.content;
    if (typeof content === "string") suggestion = content.trim();

    // Guardrails
    if (suggestion) {
      const nameAsked = state.name && asksForName(suggestion);
      const roomAsked = state.roomType && asksForRoomType(suggestion);
      const { askCheckIn, askCheckOut } = asksForDates(suggestion);
      const asksKnownDate =
        (state.checkIn && askCheckIn) || (state.checkOut && askCheckOut);
      if (nameAsked || roomAsked || asksKnownDate) {
        console.log("🛡️ Guardrail: el modelo pidió info ya conocida. Reemplazo por determinista.");
        suggestion = deterministicReply(lang, state, missing);
      }
    }
    if (!suggestion || isGenericChecklist(suggestion)) {
      suggestion = deterministicReply(lang, state, missing);
    }

    // Persistir y enviar
    if (suggestion) {
      const aiMsg: ChannelMessage = {
        ...msg,
        messageId: crypto.randomUUID(),
        sender: "assistant",
        content: suggestion,
        suggestion,
        role: "ai",
        status: options.mode === "automatic" ? "sent" : "pending",
        timestamp: new Date().toISOString(),
      };
      await saveMessageToAstra(aiMsg);
      channelMemory.addMessage(aiMsg);

      if (options.mode === "automatic") {
        await options.sendReply(suggestion);
      } else {
        const notifying =
          lang.startsWith("es")
            ? "🕓 Tu consulta está siendo revisada por un recepcionista y pronto recibirás una respuesta."
            : "🕓 Your request is being reviewed by a receptionist. You will receive a reply shortly.";
        await options.sendReply(notifying);
      }
    }
  }
}
