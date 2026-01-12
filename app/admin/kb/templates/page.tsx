import * as fs from "fs";
import * as path from "path";
import KbTemplatesClient from "../../../../components/admin/KbTemplatesClient";
import KbGeneratorControls from "../../../../components/admin/KbGeneratorControls";

export const dynamic = "force-dynamic";

type SeedEntry = {
  categoryId: string;
  name?: string;
  templates?: Record<string, { title?: string; body?: string }>;
  enabled?: boolean;
};

export default async function Page() {
  // Listamos categorías desde el seed local como fuente canónica para UI
  // (el backend ya está sincronizado via scripts/seed-category-registry.ts)
  const file = path.resolve(process.cwd(), "seeds/category_registry.json");
  let seeds: SeedEntry[] = [];
  try {
    const raw = fs.readFileSync(file, "utf8");
    seeds = JSON.parse(raw);
  } catch {}

  // Preparamos datos mínimos para la UI
  const rows = seeds.map(s => ({
    categoryId: s.categoryId,
    name: s.name || s.categoryId.split("/")[1],
    enabled: s.enabled !== false,
    languages: Object.keys(s.templates || {}),
  }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">KB Templates</h1>
        <p className="text-sm text-muted-foreground">Cargar plantillas base en hotel_content para un hotel.</p>
      </div>
      <KbTemplatesClient rows={rows} />
      <div className="pt-6 border-t">
        <KbGeneratorControls />
      </div>
    </div>
  );
}
