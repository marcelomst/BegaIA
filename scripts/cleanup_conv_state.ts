// scripts/cleanup_conv_state.ts
// pnpm tsx scripts/cleanup_con

import "dotenv/config";
import { DataAPIClient } from "@datastax/astra-db-ts";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const token    = requiredEnv("ASTRA_DB_APPLICATION_TOKEN");
  const url      = requiredEnv("ASTRA_DB_URL");
  const keyspace = requiredEnv("ASTRA_DB_KEYSPACE");

  const APPLY = process.env.APPLY === "1";
  const DROP  = process.env.DROP === "1";

  const client = new DataAPIClient(token);
  const db = client.db(url, { keyspace });

  const TARGET = "conv_state";

  // Auditoría: listar colecciones
  const cols = await db.listCollections();
  const names = cols.map((c: any) => c.name);
  const exists = names.includes(TARGET);

  console.log(`🔎 Keyspace: ${keyspace}`);
  console.log(`🔎 Colecciones existentes (${names.length}): ${names.join(", ") || "—"}`);

  if (!exists) {
    console.log(`ℹ️ No existe la colección "${TARGET}" (nada para hacer).`);
    return;
  }

  if (!APPLY) {
    console.log("💡 DRY-RUN (APPLY=1 para ejecutar cambios reales)");
    console.log(
      DROP
        ? `→ Se dropearía la colección "${TARGET}".`
        : `→ Se borrarían TODOS los documentos de "${TARGET}".`
    );
    return;
  }

  if (DROP) {
    console.log(`🗑️ Dropeando colección "${TARGET}"...`);
    await db.dropCollection(TARGET);
    console.log("✅ Colección dropeada.");
  } else {
    console.log(`🧹 Borrando TODOS los documentos de "${TARGET}"...`);
    const coll = db.collection(TARGET);
    const res: any = await coll.deleteMany({});
    console.log(`✅ deleteMany ok. Resultado:`, res);
  }
}

main().catch((err) => {
  console.error("❌ cleanup_conv_state error:", err);
  process.exit(1);
});
