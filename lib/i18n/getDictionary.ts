// Path: /root/begasist/lib/i18n/getDictionary.ts

import en from "./en";
import es from "./es";
import pt from "./pt";

const DICTS = { en, es, pt };

export async  function getDictionary(lang: string) {
  return DICTS[lang as keyof typeof DICTS] || DICTS.en;
}
