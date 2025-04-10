type Classification = {
    category: string;
    promptKey: string | null;
  };
  
  const validCategories = [
    "reservation",
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
    const isValidPromptKey =
      promptKey === null || typeof promptKey === "string";
  
    return {
      category: isValidCategory ? category : fallback.category,
      promptKey: isValidPromptKey ? promptKey : fallback.promptKey,
    };
  }
  