// /lib/classifier/categoryAliases.ts
const CATEGORY_ALIASES: Record<string, string> = {
    cancellation: "reservation",
    // futuros alias
    checkin: "reservation",
    checkout: "reservation",
    modification: "reservation",
  };
  
  export function normalizeCategory(category: string): string {
    return CATEGORY_ALIASES[category] ?? category;
  }
  