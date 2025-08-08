// Path: /root/begasist/lib/handlers/messageHandler.ts

import type { ChannelMessage } from "@/types/channel";
import { saveMessageToAstra } from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { HumanMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import crypto from "crypto";

/**
 * Procesa y guarda un mensaje unificado de canal.
 * Gestiona guest, conversación y guarda en Astra/memoria.
 * Si autoReply es true, invoca IA, guarda siempre la sugerencia
 * y en modo supervisado envía un aviso al huésped.
 */
export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    autoReply?: boolean;
    sendReply?: (reply: string) => Promise<void>;
    mode?: "automatic" | "supervised";
  }
): Promise<void> {
  // Validar contenido mínimo
  if (!msg.content || !msg.sender) {
    msg.status = "ignored";
    msg.role = "user";
    await saveMessageToAstra(msg);
    channelMemory.addMessage(msg);
    return;
  }

  // Asignar IDs y roles por defecto
  msg.messageId = msg.messageId || crypto.randomUUID();
  msg.role = msg.role || "user";

  const now = new Date().toISOString();
  const guestId = msg.guestId ?? msg.sender;

  // --- CREAR O ACTUALIZAR GUEST ---
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

  // --- CREAR O RECUPERAR CONVERSACIÓN ---
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

  // --- INVOCAR IA Y GUARDAR SUGERENCIA ---
  if (options?.sendReply) {
    const response = await agentGraph.invoke({
      hotelId: msg.hotelId,
      conversationId: msg.conversationId,
      detectedLanguage: msg.detectedLanguage, // 👈🏼 AGREGADO
      messages: [new HumanMessage(msg.content)],
    });

    const content = response.messages.at(-1)?.content;
    if (typeof content === "string" && content.trim().length > 0) {
      const suggestion = content.trim();
        // Mensaje de IA (sugerencia)
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
        // Envío inmediato en modo automático
        await options.sendReply(suggestion);
      } else {
        // En modo supervisado, avisar al huésped que está en revisión
        const notifying =
          "🕓 Tu consulta está siendo revisada por un recepcionista y pronto recibirás una respuesta.";
        await options.sendReply(notifying);

      }
      // fin
    }
  }
}
