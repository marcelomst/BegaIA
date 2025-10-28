// Path: /root/begasist/lib/agents/classify/detect.ts
/**
 * Heurística: detectar consultas sobre horario de check-in / check-out.
 * Extraído desde graph.ts (refactor Fase 1). Sin cambios funcionales.
 */
export function detectCheckinCheckoutTimeQuery(text: string): "checkin" | "checkout" | null {
    const t = (text || "").toLowerCase();
    const asksTime = /(\bhorario\b|\bhora\b|a qué hora|a que hora|what time|time is|which time|que horas|qual horário|qual horario)/i.test(t);
    if (!asksTime) return null;
    const mentionsCheckin = /(check\s*-?\s*in|\bentrada\b|\bingreso\b)/i.test(t);
    const mentionsCheckout = /(check\s*-?\s*out|\bsalida\b|\begreso\b|\bsaída\b|\bsaida\b)/i.test(t);
    if (mentionsCheckin && !mentionsCheckout) return "checkin";
    if (mentionsCheckout && !mentionsCheckin) return "checkout";
    return mentionsCheckin || mentionsCheckout ? "checkin" : null;
}
