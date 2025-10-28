// Centralized deterministic fallback responses
// Provides simple multilingual safe reply when LLM graph & structured path fail.
// Future extension: accept context with last slots / intent reasons to tailor message.

export interface FallbackOptions {
    lang?: string;          // 'es' | 'pt' | 'en'
    query?: string;         // raw user query (optional for future heuristics)
    reasons?: string[];     // optional intent heuristic reasons
}

export function ruleBasedFallback(opts: FallbackOptions | string, maybeQuery?: string): string {
    // Backward compatibility: ruleBasedFallback(lang, query)
    if (typeof opts === 'string') {
        return legacyFallback(opts, maybeQuery);
    }
    const lang = (opts.lang || 'es').toLowerCase();
    return legacyFallback(lang, opts.query);
}

function legacyFallback(lang: string, _q?: string): string {
    if (lang.startsWith('es')) {
        return '¿Podés reformular? Puedo ayudarte con reservas (fechas, tipo de habitación, huéspedes) y disponibilidad.';
    }
    if (lang.startsWith('pt')) {
        return 'Pode reformular? Posso ajudar com reservas (datas, tipo de quarto, hóspedes) e disponibilidade.';
    }
    return 'Could you rephrase? I can help with hotel bookings (dates, room type, guests) and availability.';
}
