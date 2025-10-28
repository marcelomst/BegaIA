// Path: /root/begasist/lib/agents/reservation/questions.ts
import { AIMessage, BaseMessage } from "@langchain/core/messages";
import { labelSlot } from "@/lib/agents/helpers"; // existe en helpers.ts según el código actual
import type { RequiredSlot } from "@/types/audit";
/**
 * Funciones extraídas de graph.ts (Fase 1). Sin cambios funcionales.
 */
export function buildSingleSlotQuestion(slot: RequiredSlot, lang2: "es" | "en" | "pt") {
    const L = labelSlot(slot, lang2);
    if (lang2 === "en") return `What is the ${L}?`;
    if (lang2 === "pt") {
        const artPt: Record<RequiredSlot, "o" | "a"> = {
            guestName: "o",
            roomType: "o",
            checkIn: "a",
            checkOut: "a",
            numGuests: "o",
        };
        return `Qual é ${artPt[slot]} ${L}?`;
    }
    const artEs: Record<RequiredSlot, "el" | "la"> = {
        guestName: "el",
        roomType: "el",
        checkIn: "la",
        checkOut: "la",
        numGuests: "el",
    };
    return `¿Cuál es ${artEs[slot]} ${L}?`;
}
export function questionMentionsSlot(q: string, slot: RequiredSlot, lang2: "es" | "en" | "pt") {
    const t = (q || "").toLowerCase();
    const map: Record<RequiredSlot, string[]> = {
        guestName: lang2 === "pt" ? ["nome", "hóspede"] : lang2 === "en" ? ["guest name", "name"] : ["nombre", "huésped"],
        roomType: lang2 === "pt" ? ["quarto", "tipo"] : lang2 === "en" ? ["room", "room type"] : ["habitación", "tipo"],
        checkIn: ["check-in", "check in"],
        checkOut: ["check-out", "check out"],
        numGuests: lang2 === "pt" ? ["hóspede", "hóspedes", "pessoas"] : lang2 === "en" ? ["guests", "people"] : ["huésped", "huéspedes", "personas"],
    };
    return (map[slot] || []).some((kw) => t.includes(kw));
}
// Infers the slot the assistant asked for in the last AI message
export function inferExpectedSlotFromHistory(messages: BaseMessage[], lang2: "es" | "en" | "pt"): RequiredSlot | undefined {
    for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        // Usamos instanceof AIMessage como en el código original
        if ((m as any)?.constructor?.name === "AIMessage" || (m as any) instanceof AIMessage) {
            const txt = String((m as unknown as { content?: unknown })?.content || "");
            if (questionMentionsSlot(txt, "checkOut", lang2)) return "checkOut";
            if (questionMentionsSlot(txt, "checkIn", lang2)) return "checkIn";
            if (questionMentionsSlot(txt, "numGuests", lang2)) return "numGuests";
            if (questionMentionsSlot(txt, "roomType", lang2)) return "roomType";
            if (questionMentionsSlot(txt, "guestName", lang2)) return "guestName";
            return undefined;
        }
    }
    return undefined;
}
