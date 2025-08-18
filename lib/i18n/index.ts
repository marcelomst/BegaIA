// Path: /root/begasist/lib/i18n/index.ts
import en from "./en";
import es from "./es";
import pt from "./pt";

export const SUPPORTED_LANGS = ["es", "en", "pt"] as const;
export type SupportedLang = typeof SUPPORTED_LANGS[number];

export const DICTS: Record<SupportedLang, any> = { es, en, pt };

export function isSupportedLang(x: string): x is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(x);
}

/** Normaliza un código arbitrario al mejor match soportado. */
export function normalizeLang(x?: string): SupportedLang {
  const v = (x || "").toLowerCase();
  if (isSupportedLang(v)) return v;
  if (v.startsWith("es")) return "es";
  if (v.startsWith("pt")) return "pt";
  return "en";
}
