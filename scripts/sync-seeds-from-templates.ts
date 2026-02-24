import "dotenv/config";
import fs from "fs";
import path from "path";
import { templates } from "@/lib/prompts/templates";

type SeedEntry = {
  categoryId: string;
  name?: string;
  enabled?: boolean;
  audience?: string;
  router?: { category?: string; promptKey?: string };
  retriever?: { topK?: number; filters?: Record<string, string> };
  templates?: Record<string, { title?: string; body?: string }>;
  fallback?: string;
  intents?: string[];
  version?: number;
};

function parseCategoryId(categoryId: string) {
  const [category, promptKey] = categoryId.split("/");
  return { category, promptKey };
}

function buildTemplatesIndex() {
  const map = new Map<string, Record<string, { title?: string; body?: string }>>();
  for (const [category, entries] of Object.entries(templates)) {
    for (const entry of entries as any[]) {
      const categoryId = `${category}/${entry.promptKey}`;
      if (!map.has(categoryId)) map.set(categoryId, {});
      map.get(categoryId)![entry.lang] = {
        title: entry.title,
        body: entry.body,
      };
    }
  }
  return map;
}

function defaultSeedEntry(categoryId: string): SeedEntry {
  const { category, promptKey } = parseCategoryId(categoryId);
  return {
    categoryId,
    name: promptKey,
    enabled: true,
    router: { category, promptKey },
    retriever: {
      topK: 6,
      filters: { category, promptKey, status: "active" },
    },
    fallback: "qa",
    intents: [],
    version: 1,
  };
}

function main() {
  const seedPath = path.resolve(process.cwd(), "seeds/category_registry.json");
  const raw = fs.readFileSync(seedPath, "utf8");
  const seed = JSON.parse(raw) as SeedEntry[];

  const fromTemplates = buildTemplatesIndex();
  const seedMap = new Map(seed.map((s) => [s.categoryId, s]));

  // 1) Upsert de entradas presentes en templates.ts (source of truth para plantillas)
  for (const [categoryId, tplByLang] of fromTemplates.entries()) {
    const existing = seedMap.get(categoryId);
    const base = existing ? { ...existing } : defaultSeedEntry(categoryId);
    base.templates = tplByLang;
    base.enabled = base.enabled ?? true;
    base.fallback = base.fallback ?? "qa";
    base.intents = Array.isArray(base.intents) ? base.intents : [];
    base.version = Number.isFinite(base.version as number) ? (base.version as number) : 1;

    const { category, promptKey } = parseCategoryId(categoryId);
    base.router = {
      category: base.router?.category || category,
      promptKey: base.router?.promptKey || promptKey,
    };
    base.retriever = {
      topK: base.retriever?.topK || 6,
      filters: {
        category,
        promptKey,
        status: "active",
        ...(base.retriever?.filters || {}),
      },
    };
    seedMap.set(categoryId, base);
  }

  // 2) Mantener entradas legacy que no estén en templates.ts (ej. ev_charging/channel_manager)
  const finalList = Array.from(seedMap.values()).sort((a, b) =>
    a.categoryId.localeCompare(b.categoryId)
  );

  fs.writeFileSync(seedPath, JSON.stringify(finalList, null, 2) + "\n", "utf8");

  const onlySeed = finalList
    .map((x) => x.categoryId)
    .filter((id) => !fromTemplates.has(id));

  console.log(`[sync-seeds] OK: ${finalList.length} categoryId en seeds`);
  console.log(
    `[sync-seeds] templates.ts -> seeds sincronizados: ${fromTemplates.size}`
  );
  console.log(
    `[sync-seeds] legacy preservados (solo seeds): ${
      onlySeed.length ? onlySeed.join(", ") : "(ninguno)"
    }`
  );
}

main();
