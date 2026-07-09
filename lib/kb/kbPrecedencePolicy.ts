export type KbPrecedenceInput = {
  query: string;
  lang?: "es" | "en" | "pt" | string;
  channel?: string;
  hotelId?: string;
  hasRoomImages?: boolean;
  hasReservationContext?: boolean;
  transactionalIntent?: {
    kind?: "create" | "modify" | "cancel" | "snapshot" | "verify" | null;
    confidence?: number;
  } | null;
};

export type KbPrecedenceDecision = {
  category: string;
  promptKey: string;
  categoryId: string;
  reason: string;
  confidence: number;
  source: "kb_precedence_policy";
  defersToRuntimeAction: boolean;
  winningSignal: string;
  losingSignals: string[];
};

const TRANSACTIONAL_KINDS = new Set(["create", "modify", "cancel", "snapshot", "verify"]);

const TRANSPORT_SIGNAL_RE =
  /\b(aeropuerto|aeroporto|airport|traslados?|transfer|transportes?|transportation|shuttle|taxi|remis|bus|omnibus|onibus|colectivo)\b/i;

const NEARBY_SIGNAL_RE =
  /\b(cerca|cercano|cercana|cercanos|cercanas|nearby|near|visitar|atracciones?|lugares|points?\s+of\s+interest)\b/i;

const ROOM_INVENTORY_SIGNAL_RE =
  /\b(tipos?\s+de\s+habitaciones?|habitaciones?|cuartos?|quartos?|rooms?|room\s+types?|opciones?\s+de\s+habitaci[oó]n|mostrame\s+(?:las\s+)?habitaciones?|mostrar\s+(?:las\s+)?habitaciones?|ver\s+(?:las\s+)?habitaciones?|fotos?\s+de\s+(?:las\s+)?habitaciones?|habitaciones?\s+con\s+fotos?)\b/i;

const BOOKING_ACTION_RE =
  /\b(quiero\s+reservar|reserv(?:ar|ame|a|o|emos)|hacer\s+una\s+reserva|book(?:ing)?|reserve|reservation|quero\s+reservar)\b/i;

function normalizePolicyText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveKbFastpathPrecedence(input: KbPrecedenceInput): KbPrecedenceDecision | null {
  const transactionalKind = input.transactionalIntent?.kind ?? null;
  if (input.hasReservationContext && transactionalKind && TRANSACTIONAL_KINDS.has(transactionalKind)) {
    return null;
  }

  const normalizedQuery = normalizePolicyText(input.query || "");
  if (!normalizedQuery) return null;

  if (input.hasRoomImages && ROOM_INVENTORY_SIGNAL_RE.test(normalizedQuery) && !BOOKING_ACTION_RE.test(normalizedQuery)) {
    return {
      category: "retrieval_based",
      promptKey: "room_info_img",
      categoryId: "retrieval_based/room_info_img",
      reason: "room_inventory_visual_signal_with_images",
      confidence: 0.95,
      source: "kb_precedence_policy",
      defersToRuntimeAction: false,
      winningSignal: "room_inventory_visual",
      losingSignals: ["room_info_text"],
    };
  }

  if (!TRANSPORT_SIGNAL_RE.test(normalizedQuery)) return null;

  const losingSignals = NEARBY_SIGNAL_RE.test(normalizedQuery) ? ["nearby_points"] : [];
  return {
    category: "retrieval_based",
    promptKey: "arrivals_transport",
    categoryId: "retrieval_based/arrivals_transport",
    reason: "transport_signal_over_nearby_signal",
    confidence: 0.97,
    source: "kb_precedence_policy",
    defersToRuntimeAction: false,
    winningSignal: "transport",
    losingSignals,
  };
}
