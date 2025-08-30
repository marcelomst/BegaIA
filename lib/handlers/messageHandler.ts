import type { ChannelMessage } from "@/types/channel";
import { saveMessageToAstra, getMessagesFromAstraByConversation } from "@/lib/db/messages";
import { agentGraph } from "@/lib/agents";
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages";
import { channelMemory } from "@/lib/services/channelMemory";
import { getOrCreateConversation } from "@/lib/db/conversations";
import { getGuest, createGuest, updateGuest } from "@/lib/db/guests";
import { getConvState, upsertConvState, type ReservationSlots } from "@/lib/db/convState";
import crypto from "crypto";

// Lo que el grafo espera (todo string)
type ReservationSlotsStrict = {
  guestName?: string;
  roomType?: string;
  checkIn?: string;
  checkOut?: string;
  numGuests?: string;
};

function toStrictSlots(slots?: ReservationSlots | null): ReservationSlotsStrict {
  return {
    guestName: slots?.guestName,
    roomType: slots?.roomType,
    checkIn: slots?.checkIn,
    checkOut: slots?.checkOut,
    numGuests: slots?.numGuests != null ? String(slots.numGuests) : undefined,
  };
}

function toLC(msg: ChannelMessage) {
  const txt = String(msg.content || msg.suggestion || "").trim();
  if (!txt) return null;
  if (msg.role === "ai" || msg.sender === "assistant") return new AIMessage(txt);
  return new HumanMessage(txt);
}

async function getRecentHistory(
  hotelId: string,
  channel: ChannelMessage["channel"],
  conversationId: string,
  limit = 8
) {
  const arr = await getMessagesFromAstraByConversation(hotelId, channel, conversationId);
  return arr
    .slice()
    .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime())
    .slice(-limit);
}

export async function handleIncomingMessage(
  msg: ChannelMessage,
  options?: {
    sendReply?: (reply: string) => Promise<void>;
    mode?: "automatic" | "supervised";
    skipPersistIncoming?: boolean;
  }
): Promise<void> {
  const now = new Date().toISOString();
  msg.messageId ||= crypto.randomUUID();
  msg.role ||= "user";
  msg.timestamp ||= now;

  // --- Guest
  const guestId = msg.guestId ?? msg.sender ?? "guest";
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
  } else {
    await updateGuest(msg.hotelId, guestId, { updatedAt: now });
  }
  msg.guestId = guestId;

  // --- Conversation
  const conversationId = msg.conversationId || `${msg.hotelId}-${msg.channel}-${guestId}`;
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

  // Persist incoming
  if (!options?.skipPersistIncoming) await saveMessageToAstra(msg);
  channelMemory.addMessage(msg);

  // Si no hay cómo enviar respuesta, terminamos
  // ❌ NO cortes aquí; el grafo debe correr igual, con o sin adapter
  // if (!options?.sendReply) return;

  // === Estado previo de la conversación (adhesividad) ===
  const st = await getConvState(msg.hotelId, conversationId);
  const prevCategory = st?.lastCategory ?? null;
  const prevSlots: ReservationSlots = st?.reservationSlots ?? {};

  console.log("🧷 [conv-state] loaded:", {
    conv: conversationId,
    prevCategory,
    prevSlots,
  });

  // === Contexto al LLM (historial) ===
  const lang = (msg.detectedLanguage || "es").toLowerCase();
  const knownName = guest?.name?.trim();
  const systemMsgText =
    `You are a hotel front-desk assistant. Reply in ${lang}. ` +
    (knownName ? `If possible, greet the guest by their name "${knownName}". ` : "") +
    `When the guest wants to make a reservation, collect ONLY missing fields from: ` +
    `guest name, room type, check-in date, check-out date. Keep it concise.`;

  const recent = await getRecentHistory(msg.hotelId, msg.channel, conversationId, 8);
  const lcHistory = recent.map(toLC).filter(Boolean) as (HumanMessage | AIMessage)[];
  const lcMessages = [new SystemMessage(systemMsgText), ...lcHistory, new HumanMessage(String(msg.content || ""))];

  let finalText = "";
  let nextCategory: string | null = prevCategory;
  let nextSlots: ReservationSlots = prevSlots;

  try {
    console.log("🚀 [graph] invoking…");
    const convState = await getConvState(msg.hotelId, conversationId);
    const reservationSlotsStrict = toStrictSlots(convState?.reservationSlots);

    const graphResult = await agentGraph.invoke({
      hotelId: msg.hotelId,
      conversationId,
      detectedLanguage: msg.detectedLanguage,
      normalizedMessage: String(msg.content || ""),
      messages: lcMessages,
      reservationSlots: reservationSlotsStrict,
      meta: { channel: msg.channel },
    });

    console.log(
      "🧪 [graph] last message type/content =",
      typeof graphResult.messages.at(-1)?.content,
      graphResult.messages.at(-1)?.content
    );

    finalText =
      typeof graphResult.messages.at(-1)?.content === "string"
        ? String(graphResult.messages.at(-1)?.content).trim()
        : "";

    nextCategory = (graphResult as any).category ?? prevCategory ?? null;

    const mergedSlots: ReservationSlots = {
      ...(prevSlots || {}),
      ...((graphResult as any).reservationSlots || {}),
    };
    if (typeof mergedSlots.numGuests !== "undefined" && typeof mergedSlots.numGuests !== "string") {
      mergedSlots.numGuests = String(mergedSlots.numGuests as any);
    }
    nextSlots = mergedSlots;
  } catch (err: any) {
    console.error("❌ [messageHandler] agentGraph error:", err?.stack || err);
    finalText = lang.startsWith("es")
      ? "Perdón, tuve un problema procesando tu consulta. ¿Podés intentar de nuevo?"
      : lang.startsWith("pt")
      ? "Desculpe, tive um problema ao processar sua solicitação. Pode tentar novamente?"
      : "Sorry, I had an issue processing your request. Could you try again?";
    console.warn("⚠️ [graph] fallback emitido");
  }

  if (!finalText) {
    finalText = lang.startsWith("es")
      ? "¿Podrías contarme un poco más para ayudarte mejor?"
      : lang.startsWith("pt")
      ? "Você pode me contar um pouco mais para que eu possa ajudar melhor?"
      : "Could you tell me a bit more so I can help?";
    console.warn("⚠️ [graph] finalText vacío → usando fallback suave");
  }

  const suggestion = finalText;
  const aiMsg: ChannelMessage = {
    ...msg,
    messageId: crypto.randomUUID(),
    sender: "assistant",
    role: "ai",
    content: suggestion,
    suggestion,
    status: (guest.mode ?? "automatic") === "automatic" ? "sent" : "pending",
    timestamp: new Date().toISOString(),
  };

  await saveMessageToAstra(aiMsg);
  channelMemory.addMessage(aiMsg);

  // Emitir por el canal si tenemos adapter; si no, fallback a SSE directo
  try {
    console.log("📤 [reply] via adapter?", !!options?.sendReply, { len: suggestion.length });

    if (aiMsg.status === "sent") {
      if (options?.sendReply) {
        await options.sendReply(suggestion);
      } else {
        // Fallback: emitir SSE directo (para web) si no vino adapter
        const { emitToConversation } = await import("@/lib/web/eventBus");
        emitToConversation(conversationId, {
          type: "message",
          sender: "assistant",
          text: suggestion,
          timestamp: new Date().toISOString(),
        });
        console.log("📡 [reply] fallback SSE directo (sin adapter)");
      }
    } else {
      const fallback =
        lang.startsWith("es")
          ? "🕓 Tu consulta está siendo revisada por un recepcionista."
          : lang.startsWith("pt")
          ? "🕓 Sua solicitação está sendo revisada por um recepcionista."
          : "🕓 Your request is being reviewed by a receptionist.";
      if (options?.sendReply) {
        await options.sendReply(fallback);
      } else {
        const { emitToConversation } = await import("@/lib/web/eventBus");
        emitToConversation(conversationId, {
          type: "message",
          sender: "assistant",
          text: fallback,
          timestamp: new Date().toISOString(),
        });
        console.log("📡 [reply] fallback SSE directo (sin adapter) - supervised");
      }
    }
  } catch (err) {
    console.error("❌ [messageHandler] sendReply error:", err);
  }

  // Persistencia de estado
  try {
    console.log("💾 [conv-state] saving:", { conv: conversationId, nextCategory, nextSlots });
    await upsertConvState(msg.hotelId, conversationId, {
      lastCategory: nextCategory,
      reservationSlots: nextSlots,
    });
  } catch (err) {
    console.warn("⚠️ [messageHandler] upsertConvState warn:", err);
  }

}
