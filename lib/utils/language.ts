import { franc } from "franc";

const supportedLanguages = new Set(["spa", "eng", "ita", "fra", "por"]);

export function detectLanguage(text: string): string {
  if (!text || text.trim().length < 10) return "spa";

  const lang = franc(text.trim(), { minLength: 3 });

  return supportedLanguages.has(lang) ? lang : "spa";
}
