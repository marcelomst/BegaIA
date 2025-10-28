// Path: lib/handlers/pipeline/intent.ts
// Intent heurístico enriquecido extraído desde messageHandler.
// Mantiene compatibilidad con los valores previos (reservation | modify | general_question)
// y expone intent "raw" para futuras expansiones.

export interface DetectIntentOptions {
    lang?: string;
    stateForPlaybook?: { draft?: any; confirmedBooking?: any; locale?: string };
    hasSlots?: boolean;
}

export interface RichIntentResult {
    raw: string;          // intent granular (p.ej. cancel_reservation, availability_query)
    normalized: 'reservation' | 'modify' | 'general_question'; // usado hoy por playbook
    reasons: string[];    // pistas heurísticas (para debugging / auditoría futura)
}

// Palabras clave agrupadas
const RE_MODIFY = /(modific|cambi|alter|mudar|change|update|editar|edit|corrig)/i;
const RE_RESERVATION = /(reserv|booking|book)/i;
const RE_CANCEL = /(cancel|anul|cance(lar)?)/i;
const RE_AVAIL = /(disponibil|availability|hay\s+disponibilidad|tienen\s+disponibilidad|have\s+availability)/i;
const RE_SUPPORT = /(wifi|wi[- ]?fi|internet|estacionamiento|parking|spa|pileta|piscina|pool|desayuno|breakfast)/i;

export function detectIntentRich(textRaw: string, _opts?: DetectIntentOptions): RichIntentResult {
    const text = String(textRaw || '').toLowerCase();
    const reasons: string[] = [];
    if (RE_MODIFY.test(text)) { reasons.push('modify:RE_MODIFY'); return { raw: 'modify_reservation', normalized: 'modify', reasons }; }
    if (RE_RESERVATION.test(text)) { reasons.push('reservation:RE_RESERVATION'); return { raw: 'reservation', normalized: 'reservation', reasons }; }
    if (RE_CANCEL.test(text)) { reasons.push('cancel:RE_CANCEL'); return { raw: 'cancel_reservation', normalized: 'general_question', reasons }; }
    if (RE_AVAIL.test(text)) { reasons.push('availability:RE_AVAIL'); return { raw: 'availability_query', normalized: 'general_question', reasons }; }
    if (RE_SUPPORT.test(text)) { reasons.push('support:RE_SUPPORT'); return { raw: 'support', normalized: 'general_question', reasons }; }
    // fallback genérico
    reasons.push('fallback:general_question');
    return { raw: 'general_question', normalized: 'general_question', reasons };
}
