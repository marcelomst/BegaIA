import { templates, type Lang, type Category, type TemplateEntry } from "@/lib/prompts/templates";

type CategoryNoOther = Exclude<Category, "other">;

export type BaseTemplate = {
  categoryId: string;
  name: string;
  enabled: boolean;
  templates: Record<string, { title?: string; body?: string }>;
};

function byCategoryPromptLang(): Map<string, Map<Lang, TemplateEntry>> {
  const idx = new Map<string, Map<Lang, TemplateEntry>>();
  const cats = Object.keys(templates) as CategoryNoOther[];
  for (const cat of cats) {
    for (const entry of templates[cat] || []) {
      const key = `${cat}/${entry.promptKey}`;
      if (!idx.has(key)) idx.set(key, new Map<Lang, TemplateEntry>());
      idx.get(key)!.set(entry.lang, entry);
    }
  }
  return idx;
}

export function listBaseTemplatesFromCode(): BaseTemplate[] {
  const grouped = byCategoryPromptLang();
  const rows: BaseTemplate[] = [];
  for (const [categoryId, langs] of grouped.entries()) {
    const anyTpl = langs.values().next().value as TemplateEntry | undefined;
    const templatesByLang: Record<string, { title?: string; body?: string }> = {};
    for (const [lang, tpl] of langs.entries()) {
      templatesByLang[lang] = { title: tpl.title, body: tpl.body };
    }
    rows.push({
      categoryId,
      name: anyTpl?.title || categoryId.split("/")[1],
      enabled: true,
      templates: templatesByLang,
    });
  }
  rows.sort((a, b) => a.categoryId.localeCompare(b.categoryId));
  return rows;
}

export function getBaseTemplateFromCode(categoryId: string, lang: string): { title?: string; body?: string } | null {
  const grouped = byCategoryPromptLang();
  const map = grouped.get(categoryId);
  if (!map) return null;
  const req = String(lang || "es").toLowerCase() as Lang;
  const pick = map.get(req) || map.get("es") || map.get("en") || map.get("pt") || map.values().next().value;
  if (!pick) return null;
  return { title: pick.title, body: pick.body };
}

