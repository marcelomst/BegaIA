import type { IntentResult } from "@/types/audit";

const LOOKS_ROOM_INFO_RE = /\b(check[- ]?in|check[- ]?out|ingreso|salida|horario|hora(s)?)\b/i;
export function looksRoomInfo(s: string): boolean {
  return LOOKS_ROOM_INFO_RE.test(s || "");
}



export function looksLikeName(s: string) {
  const t = (s || "").trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/[0-9?!,:;@]/.test(t)) return false;
  const tokens = t.split(/\s+/);
  if (tokens.length === 0 || tokens.length > 3) return false;
  const STOP = new Set([
    "hola","buenas","hello","hi","hey","olá","ola","oi",
    "que","qué","cuando","cuándo","donde","dónde","como","cómo",
    "hora","precio","policy","política","check","in","out",
    "reserva","reservo","quiero","quero","tiene","hay"
  ]);
  if (tokens.some(w => STOP.has(w.toLowerCase()))) return false;
  if (!tokens.every(w => /^[\p{L}.'-]+$/u.test(w))) return false;
  return true;
}

export function normalizeNameCase(s: string) {
  return s
  .trim()
 .split(/\s+/)
 .map(w => w.slice(0,1).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function heuristicClassify(text: string): IntentResult {
  const t = (text || "").toLowerCase();

  const isCancel = /\b(cancel(ar|la|ación)|anular|delete|remove|void|cancel)\b/.test(t);
  if (isCancel) {
    return { category: "cancel_reservation", desiredAction: "cancel", intentConfidence: 0.9, intentSource: "heuristic" };
  }

  const isModify = /\b(modific(ar|arla|ación)|change|cambiar|editar|move|mover)\b/.test(t);
  const isReserve = /\b(reserv(ar|a)|book|booking|quiero reservar|quero reservar)\b/.test(t);
  if (isModify) {
    return { category: "reservation", desiredAction: "modify", intentConfidence: 0.8, intentSource: "heuristic" };
  }
  if (isReserve) {
    return { category: "reservation", desiredAction: "create", intentConfidence: 0.75, intentSource: "heuristic" };
  }

  const isAmenities = /\b(piscina|pool|spa|gym|gimnasio|estacionamiento|parking|amenities|desayuno|breakfast)\b/.test(t);
  if (isAmenities) {
    return { category: "amenities", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isBilling = /\b(factura|invoice|cobro|charge|billing|recibo)\b/.test(t);
  if (isBilling) {
    return { category: "billing", desiredAction: undefined, intentConfidence: 0.7, intentSource: "heuristic" };
  }

  const isSupport = /\b(ayuda|help|soporte|support|problema|issue)\b/.test(t);
  if (isSupport) {
    return { category: "support", desiredAction: undefined, intentConfidence: 0.65, intentSource: "heuristic" };
  }
  
  const mentionsRoomWord =
    /\b(single|individual|simple|double|doble|matrimonial|twin|queen|king|triple|suite|familiar)\b/i.test(t);

  if (mentionsRoomWord) {
    return { category: "reservation", desiredAction: "create", intentConfidence: 0.76, intentSource: "heuristic" };
  }


  return { category: "retrieval_based", desiredAction: undefined, intentConfidence: 0.5, intentSource: "heuristic" };
}