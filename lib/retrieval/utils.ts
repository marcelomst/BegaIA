// Path: /root/begasist/lib/retrieval/utils.ts

/**
 * Normaliza texto antes de embedding: trims, colapsa espacios y remueve chars de control.
 */
export function normalizeForEmbedding(text: string): string {
    if (!text) return "";
    return text
        .replace(/[\r\t]+/g, " ")
        .replace(/\u0000/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Normaliza códigos de idioma a ISO-1 (es|en|pt) a partir de franc (spa|eng|por...).
 */
export function normalizeLang(code: string | undefined | null): 'es' | 'en' | 'pt' {
    const c = (code || '').toLowerCase();
    if (c.startsWith('spa') || c === 'es') return 'es';
    if (c.startsWith('eng') || c === 'en') return 'en';
    if (c.startsWith('por') || c === 'pt') return 'pt';
    return 'es';
}
