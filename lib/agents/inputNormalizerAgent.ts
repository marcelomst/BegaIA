// Path: /root/begasist/lib/agents/inputNormalizerAgent.ts
// Fase 2: Esqueleto de agente. En esta fase el coordinador sigue siendo messageHandler.ts
// Este módulo define la interfaz del normalizador y un contenedor para futura extracción total.

import type { ChannelMessage, ChannelMode } from "@/types/channel";
import { extractSlotsFromText } from "@/lib/agents/helpers"; // reutiliza helper existente
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import { getConvState } from "@/lib/db/convState";
import { getMessagesByConversation, type MessageDoc } from "@/lib/db/messages";

// Nota: Esta primera implementación es deliberadamente mínima. No mueve persistencia
// ni idempotencia. Solo fija idioma, inicializa slots básicos y retorna estructura.
// Campos no migrados (intent, hints, systemInstruction, inModifyMode, stateForPlaybook, etc.)
// permanecen dentro de preLLM en messageHandler.ts para próximas fases.

export type InputNormalizerOptions = {
    sendReply?: (reply: string) => Promise<void>;
    mode?: ChannelMode;
    skipPersistIncoming?: boolean;
};

// Estructura mínima esperada por bodyLLM (PreLLMResult actual)
export type NormalizedContext = {
    // Campos clave llenados por runInputNormalizer (Fase 1.5)
    lang: "es" | "en" | "pt";
    conversationId: string;
    guest: any;
    lcHistory: (HumanMessage | AIMessage)[];
    currSlots: any;
    prevCategory: string | null;
    prevSlotsStrict: any;
    st: any;
    stateForPlaybook?: { draft: any | null; confirmedBooking: { code?: string } | null; locale: "es" | "en" | "pt" };
    // Bandera opcional para idempotencia suave; no implica lecturas/escrituras fuertes
    isDuplicateSoft?: boolean;
    // Echo de entrada para consumidores posteriores
    msg: ChannelMessage;
    options: InputNormalizerOptions;
    // Otros campos dejados para futura migración: intent, hints, systemInstruction, etc.
};

/**
 * Por ahora, este es un placeholder typed para facilitar la futura migración de preLLM.
 * El coordinador (messageHandler.ts) seguirá construyendo este objeto.
 */
export type InputNormalizerParams = {
    msg: ChannelMessage;
    options?: InputNormalizerOptions;
    prevCategory?: string | null;
    prevSlotsStrict?: any; // Passthrough desde conv_state si disponible
};

// Selección de idioma mínima reutilizando regla actual (msg.detectedLanguage fallback 'es').
function selectLang(msg: ChannelMessage): "es" | "en" | "pt" {
    const raw = (msg.detectedLanguage || "es").toLowerCase();
    return (["es", "en", "pt"].includes(raw) ? raw : "es") as any;
}

// Helpers locales (replicados de handler para evitar dependencia circular)
function toLC(msg: ChannelMessage) {
    const txt = String(msg.content || (msg as any).suggestion || "").trim();
    if (!txt) return null;
    if (msg.role === "ai" || msg.sender === "assistant") return new AIMessage(txt);
    return new HumanMessage(txt);
}

function sortAscByTimestamp<T extends { timestamp?: string }>(a: T, b: T) {
    const ta = new Date(a.timestamp || 0).getTime();
    const tb = new Date(b.timestamp || 0).getTime();
    return ta - tb;
}

async function getRecentHistorySafe(
    hotelId: string,
    channel: ChannelMessage["channel"],
    conversationId: string,
    limit = 8
): Promise<(HumanMessage | AIMessage)[]> {
    try {
        const arr: MessageDoc[] = await getMessagesByConversation({ hotelId, conversationId, limit: Math.max(limit * 3, 24) });
        const normalized: ChannelMessage[] = arr.map((d) => ({
            messageId: d.messageId,
            hotelId: d.hotelId,
            channel: d.channel as ChannelMessage["channel"],
            sender: (d as any).sender ?? "Usuario",
            content: d.content ?? "",
            suggestion: (d as any).suggestion ?? "",
            status: d.status as ChannelMessage["status"],
            timestamp: d.timestamp ?? "",
            role: (d as any).role,
            conversationId: d.conversationId ?? undefined,
            guestId: (d as any).guestId,
            detectedLanguage: (d as any).detectedLanguage,
        }));
        const recent = normalized.filter((m) => m.channel === channel).sort(sortAscByTimestamp).slice(-limit);
        return recent.map(toLC).filter(Boolean) as (HumanMessage | AIMessage)[];
    } catch (err) {
        console.error("⚠️ [normalizer] getRecentHistory fallback [] por error:", (err as any)?.message || err);
        return [];
    }
}

function toStrictSlots(slots?: any | null): any {
    return {
        guestName: slots?.guestName,
        roomType: slots?.roomType,
        checkIn: slots?.checkIn,
        checkOut: slots?.checkOut,
        numGuests: slots?.numGuests != null ? String(slots?.numGuests) : undefined,
    };
}

export async function runInputNormalizer(params: InputNormalizerParams): Promise<NormalizedContext> {
    const { msg, options } = params;
    const lang = selectLang(msg);

    // Definir conversationId/guest placeholders sin crear entidades (no-persist)
    const conversationId = (msg as any).conversationId || msg.conversationId || `${msg.hotelId}-${msg.channel}-${(msg.guestId || msg.sender || "guest")}`;
    const guest = (msg as any).guest || { guestId: msg.guestId || msg.sender || "guest" };

    // Cargar estado previo si hay conversationId disponible (solo lectura)
    let st: any = undefined;
    let prevCategory: string | null = params.prevCategory ?? null;
    let prevSlotsStrict: any = params.prevSlotsStrict ?? {};
    try {
        if (msg.hotelId && conversationId) {
            st = await getConvState(msg.hotelId, conversationId);
            if (st) {
                prevCategory = prevCategory ?? (st.lastCategory ?? null);
                prevSlotsStrict = Object.keys(prevSlotsStrict || {}).length ? prevSlotsStrict : toStrictSlots(st?.reservationSlots);
            }
        }
    } catch (e) {
        // Silencioso: si no podemos leer conv_state, seguimos con passthrough
    }

    // Construir historial LC reciente equivalente al de preLLM
    let lcHistory: (HumanMessage | AIMessage)[] = [];
    try {
        if (msg.hotelId && conversationId) {
            lcHistory = await getRecentHistorySafe(msg.hotelId, msg.channel, conversationId, 8);
        }
    } catch { lcHistory = []; }

    // Curr slots: fusionar prevStrict + turnSlots (turn overwrites)
    let turnSlots: any = {};
    try {
        turnSlots = extractSlotsFromText(String(msg.content || ""), lang) || {};
    } catch { turnSlots = {}; }
    const currSlots = { ...(prevSlotsStrict || {}), ...(turnSlots || {}) };

    // stateForPlaybook equivalente (no persistente)
    const draftExists = !!currSlots.guestName || !!currSlots.roomType || !!currSlots.checkIn || !!currSlots.checkOut || !!currSlots.numGuests;
    const hasConfirmed = !!(st?.reservationSlots && st?.salesStage === "close");
    const confirmedBooking = hasConfirmed ? { code: "-" } : null;
    const stateForPlaybook = { draft: draftExists ? { ...currSlots } : null, confirmedBooking, locale: lang } as const;

    // Idempotencia suave (placeholder): no lectura fuerte; dejamos false por defecto
    const isDuplicateSoft = false;

    return {
        lang,
        conversationId,
        guest,
        lcHistory,
        currSlots,
        prevCategory,
        prevSlotsStrict,
        st,
        stateForPlaybook,
        isDuplicateSoft,
        msg,
        options: options || {},
    };
}
