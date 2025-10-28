// Path: /root/begasist/lib/retrieval/validateClassification.ts
type Classification = {
  category: string;
  promptKey: string | null;
};

const validCategories = [
  "reservation",
  "cancellation", // nueva categoría RAG dedicada
  "cancel_reservation", // ← faltaba
  "billing",
  "support",
  "amenities",
  "retrieval_based",
];

export function validateClassification(item: any): Classification {
  const fallback: Classification = {
    category: "retrieval_based",
    promptKey: null,
  };

  if (!item || typeof item !== "object") return fallback;

  const { category, promptKey } = item;

  const isValidCategory = validCategories.includes(category);
  const isValidPromptKey = promptKey === null || typeof promptKey === "string";

  return {
    category: isValidCategory ? category : fallback.category,
    promptKey: isValidPromptKey ? promptKey : fallback.promptKey,
  };
}
