// Path: /root/begasist/lib/agents/classify/keywords.ts
/**
 * Regex de rutas rápidas y de info general.
 * Extraídos de graph.ts (Fase 1). Sin cambios funcionales.
 */
export const RE_TRANSPORT = /(aeroporto|aeropuerto|airport|traslados?|transfer|taxi|remis|bus|ônibus|omnibus|colectivo|metro|subte)/i;
export const RE_BILLING = /(pago|pagos|pagar|pagamento|meio(?:s)? de pagamento|tarjeta|tarjetas|cart[aã]o|cart[oõ]es|d[eé]bito|cr[eé]dito|facturaci[oó]n|factura|fatura|invoice|billing|cobro|cobrar|btc|bitcoin|crypto|cript(o|o)moneda|criptomoeda)/i;
export const RE_SUPPORT = /(whats?app|contacto|cont[aá]ctar|contato|tel[eé]fono|telefone|telefono|llamar|ligar|email|correo|soporte|suporte|support)/i;
export const RE_BREAKFAST = /(\bdesayuno\b|breakfast|desayunar|café da manhã|caf[ée] da manh[ãa])/i;
export const RE_AMENITIES = /\b(amenities|servicios(\s+principales)?|servi[cç]os?|piscina|pool|gimnasio|gym|academia|spa|estacionamiento|parking|mascotas?|pets?|animal(es)?|animais?)\b/i;
export function looksGeneralInfo(t: string) {
    const s = (t || "").toLowerCase();
    return (
        /\b(mascotas?|pet(s)?|animal(es)?|animais?)\b/.test(s) ||
        /\b(ubicaci[oó]n|direccion|direcci[oó]n|address|ubicados?|location|localiza[cç][aã]o|endere[cç]o)\b/.test(s) ||
        /\b(piscina|desayuno|breakfast|café da manhã|caf[ée] da manh[ãa]|parking|estacionamiento|spa|gym|gimnasio|gin[aá]sio|amenities|servicios(\s+principales)?|servi[cç]os?)\b/.test(s)
    );
}
