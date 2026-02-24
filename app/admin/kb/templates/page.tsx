import KbTemplatesClient from "../../../../components/admin/KbTemplatesClient";
import KbGeneratorControls from "../../../../components/admin/KbGeneratorControls";
import { listBaseTemplatesFromCode } from "@/lib/prompts/sourceOfTruth";

export const dynamic = "force-dynamic";

export default async function Page() {
  // Fuente de verdad: templates.ts (catálogo en código)
  const rows = listBaseTemplatesFromCode().map((s) => ({
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
