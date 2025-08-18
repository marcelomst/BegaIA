// Path: /root/begasist/lib/i18n/getDictionary.ts
import { DICTS, normalizeLang, type SupportedLang } from "./index";

export async function getDictionary(lang: string) {
  const key = normalizeLang(lang);
  switch (key) {
    case "es": return (await import("./es")).default;
    case "pt": return (await import("./pt")).default;
    default:   return (await import("./en")).default;
  }
}

