export type CreateQuoteConfirmationContext = {
  inModifyMode?: boolean;
  quotePromptActive?: boolean;
  lastProposal?: unknown;
  salesStage?: string | null;
  conversationStage?: string | null;
  hasCompleteReservationSnapshot?: boolean;
};

export function isExplicitCreateCommitSignal(text: string): boolean {
  const normalized = String(text || "").toLowerCase().trim();
  if (!normalized) return false;
  return (
    /\b(confirmar|confirmo|confirmame|confirma|comfirmar|confimar|cofirmar|confirm)\b/.test(normalized) ||
    /\b(si|sí)\s*,?\s*confirmo\b/.test(normalized) ||
    /\bok\s+hacelo\b/.test(normalized) ||
    /\bdale\b/.test(normalized) ||
    /\bde acuerdo\b/.test(normalized)
  );
}

export function hasCreateQuoteConfirmationContext({
  inModifyMode,
  quotePromptActive,
  lastProposal,
  salesStage,
  conversationStage,
}: CreateQuoteConfirmationContext): boolean {
  if (inModifyMode) return false;
  return Boolean(
    quotePromptActive ||
    lastProposal ||
    salesStage === "quote" ||
    conversationStage === "reservation_quoted"
  );
}

export function hasCreateExecutionContext({
  inModifyMode,
  quotePromptActive,
  lastProposal,
  salesStage,
  conversationStage,
  hasCompleteReservationSnapshot,
}: CreateQuoteConfirmationContext): boolean {
  if (hasCreateQuoteConfirmationContext({
    inModifyMode,
    quotePromptActive,
    lastProposal,
    salesStage,
    conversationStage,
  })) {
    return true;
  }
  return Boolean(!inModifyMode && hasCompleteReservationSnapshot);
}

export function isBareAffirmativeForQuotedCreate(text: string): boolean {
  return /^(si)$/.test(
    String(text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .replace(/[!?.,;:]+$/g, "")
  );
}
