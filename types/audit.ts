// /types/audit.ts
export type IntentCategory =
  | "reservation"
  | "cancel_reservation"
  | "amenities"
  | "billing"
  | "support"
  | "retrieval_based";

export type DesiredAction = "create" | "modify" | "cancel" | undefined;

export type RequiredSlot = "guestName" | "roomType" | "checkIn" | "checkOut" | "numGuests";

export type SlotMap = Partial<Record<RequiredSlot, string>>;

export type Interpretation = {
  source: "pre" | "llm";
  category: IntentCategory;
  desiredAction?: DesiredAction;
  slots: SlotMap;             // SIEMPRE strings (normalizados)
  confidence: {
    intent: number;           // 0..1
    slots: Record<RequiredSlot, number | undefined>; // 0..1 por slot (parcial)
  };
  notes?: string[];           // trazas
};

export type Verdict =
  | { status: "agree"; winner: "llm"; reason: string }
  | { status: "disagree"; reason: string; deltas: string[] };

export type SupervisionRecord = {
  at: string;
  messageText: string;
  pre: Interpretation;
  llm: Interpretation;
  verdict: Verdict;
  hotelId: string;
  conversationId: string;
};

export type IntentResult = {
  category: IntentCategory;
  desiredAction: DesiredAction;
  intentConfidence: number;
  intentSource: IntentSource;
};

type IntentSource = "heuristic" | "llm" | "embedding";