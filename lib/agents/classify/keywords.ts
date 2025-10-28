// Path: /root/begasist/lib/agents/classify/keywords.ts
/**
 * Regex de rutas rápidas y de info general.
 * Extraídos de graph.ts (Fase 1). Sin cambios funcionales.
 */
export const RE_TRANSPORT = /(aeroporto|aeropuerto|airport|traslados?|transfer|taxi|remis|bus|ônibus|omnibus|colectivo|metro|subte)/i;
export const RE_BILLING = /(pago|pagos|pagar|pagamento|meio(?:s)? de pagamento|tarjeta|tarjetas|cartão|cartões|d[eé]bito|cr[eé]dito|facturaci[oó]n|factura|fatura|invoice|billing|cobro|cobrar)/i;
export const RE_SUPPORT = /(whats?app|contacto|cont[aá]ctar|contato|tel[eé]fono|telefone|telefono|llamar|ligar|email|correo|soporte|suporte|support)/i;
export const RE_BREAKFAST = /(\bdesayuno\b|breakfast|desayunar|café da manhã|caf[ée] da manh[ãa])/i;
export function looksGeneralInfo(t: string) {
    const s = (t || "").toLowerCase();
    return (
        /\b(mascotas?|pet(s)?|animal(es)?|animais?)\b/.test(s) ||
        /\b(ubicaci[oó]n|direccion|direcci[oó]n|address|ubicados?|location|localiza[cç][aã]o|endere[cç]o)\b/.test(s) ||
        /\b(piscina|desayuno|breakfast|café da manhã|caf[ée] da manh[ãa]|parking|estacionamiento|spa|gym|gimnasio|gin[aá]sio|amenities|servicios(\s+principales)?|servi[cç]os?)\b/.test(s)
    );
}
