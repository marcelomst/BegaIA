// Path: /root/begasist/lib/handlers/universalChannelEventHandler.ts

import { handleIncomingMessage } from "./messageHandler";
import { analyzeSentiment } from "@/lib/utils/analyzeSentiment";
import { detectLanguage } from "@/lib/utils/language";
import crypto from "crypto";
import type { ChannelMessage } from "@/types/channel";

/**
 * Handler universal: procesa un evento crudo de cualquier canal y lo transforma a ChannelMessage,
 * aplica análisis de sentimiento e idioma, y delega a handleIncomingMessage.
 * Admite opciones de reply automático/supervisado y custom sendReply por canal.
 */
export async function universalChannelEventHandler(
  rawEvent: any,         // Puede venir de email, web, whatsapp, CM, etc.
  hotelId: string,
  opts?: {
    mode?: "automatic" | "supervised";
    sendReply?: (reply: string) => Promise<void>; // Custom reply por canal
    forceGuestId?: string; // Si querés sobreescribir el guestId detectado
  }
) {
  // 1. Detectar idioma del mensaje (usando tu helper)
  const lang = await detectLanguage(rawEvent.content, hotelId);

  // 2. Analizar sentimiento del mensaje
  const sentiment = await analyzeSentiment(rawEvent.content, lang);

  // 3. Armar ChannelMessage universal
  const channelMsg: ChannelMessage = {
    messageId: rawEvent.messageId || rawEvent.id || crypto.randomUUID(),
    conversationId: rawEvent.conversationId || "",
    hotelId,
    channel: rawEvent.channel || "unknown",
    sender: rawEvent.sender || rawEvent.guestId || "guest",
    guestId: opts?.forceGuestId || rawEvent.guestId || rawEvent.sender || "guest",
    content: rawEvent.content,
    timestamp: rawEvent.timestamp || new Date().toISOString(),
    time: new Date(rawEvent.timestamp || Date.now()).toLocaleTimeString(),
    suggestion: rawEvent.suggestionByHA ?? "",
    status: rawEvent.status || "pending",
    sentiment,
    detectedLanguage: lang,
    // Agregá otros campos que use tu ChannelMessage
  };

  // 4. Procesar el mensaje conversacional unificado
  await handleIncomingMessage(channelMsg, {
    autoReply: opts?.mode === "automatic",
    sendReply: opts?.sendReply,
    mode: opts?.mode || "automatic",
  });

  return { ok: true };
}
