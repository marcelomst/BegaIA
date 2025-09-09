#!/usr/bin/env tsx
/**
 * Limpia documentos de prueba en `system_playbook`.
 * - DRY-RUN por defecto (solo audita).
 * - Ejecutar borrado real:  APPLY=1 pnpm tsx /root/begasist/scripts/cleanup_system_playbook.ts
 * - Cambiar patrón:         PATTERN="seed test|__smoke__|dummy|smoke"
 */

import "dotenv/config";
import { getAstraDB } from "@/lib/astra/connection";

type SpbDoc = {
  _id: string;
  text?: string;
  category?: string | null;
  promptKey?: string | null;
  [k: string]: any;
};

function toNames(arr: any[]): string[] {
  return (arr || [])
    .map((x) =>
      typeof x === "string"
        ? x
        : x?.name ?? x?.collectionName ?? x?.collection ?? x?.info?.name ?? null
    )
    .filter(Boolean);
}

async function listCollectionNames(db: any): Promise<string[]> {
  try {
    const r = await db.listCollections();
    if (Array.isArray(r)) return toNames(r);
    if (Array.isArray(r?.collections)) return toNames(r.collections);
    if (Array.isArray(r?.status?.collections)) return toNames(r.status.collections);
    if (Array.isArray(r?.data?.collections)) return toNames(r.data.collections);
    return [];
  } catch {
    return [];
  }
}

async function main() {
  const APPLY = process.env.APPLY === "1";
  const pattern = new RegExp(process.env.PATTERN ?? "seed test|__smoke__|dummy|smoke", "i");

  const db = getAstraDB();
  const names = await listCollectionNames(db);
  const printable = names.length ? names.join(", ") : "(ninguna)";

  if (!names.includes("system_playbook")) {
    console.error("ℹ️ No existe la colección `system_playbook` (nada para limpiar).");
    console.error("Colecciones vistas:", printable);
    process.exit(0);
  }

  const col = db.collection<SpbDoc>("system_playbook");
  const docs = await col.find({}).toArray();
  console.log(`[audit] system_playbook: ${docs.length} documento(s).`);

  if (!docs.length) {
    console.log("✅ Vacío. Nada que hacer.");
    return;
  }

  const candidates = docs.filter(
    (d) =>
      d._id === "__smoke__" ||
      pattern.test(d._id) ||
      (typeof d.text === "string" && pattern.test(d.text))
  );

  if (!candidates.length) {
    console.log("✅ No se detectaron documentos de prueba según el patrón.");
    return;
  }

  console.log(`[audit] Candidatos (${candidates.length}):`);
  for (const d of candidates) {
    const preview = (d.text ?? "").slice(0, 80).replace(/\n/g, " ");
    console.log(
      ` - _id=${d._id}  category=${d.category ?? "-"}  promptKey=${d.promptKey ?? "-"}  preview="${preview}"`
    );
  }

  if (!APPLY) {
    console.log(
      `\n🧪 DRY-RUN. Para borrar realmente:\n  APPLY=1 pnpm tsx /root/begasist/scripts/cleanup_system_playbook.ts`
    );
    console.log(
      `Patrón opcional:\n  PATTERN="seed test|__smoke__|prueba" APPLY=1 pnpm tsx /root/begasist/scripts/cleanup_system_playbook.ts`
    );
    return;
  }

  let ok = 0,
    fail = 0;
  for (const d of candidates) {
    try {
      await col.deleteOne({ _id: d._id });
      ok++;
    } catch (e: any) {
      console.error(`❌ Error borrando _id=${d._id}:`, e?.message ?? e);
      fail++;
    }
  }
  console.log(`\n🎯 Listo. Borrados OK=${ok}, errores=${fail}`);
}

main().catch((e) => {
  console.error("❌ cleanup_system_playbook error:", e);
  process.exit(1);
});
