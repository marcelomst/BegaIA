// scripts/print_system_playbook.ts
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

  // CLI: key=reservation_flow lang=es
  const kv = new Map(
    process.argv.slice(2).map((s) => {
      const i = s.indexOf("=");
      return i === -1 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
    }),
  );
  const promptKey = kv.get("key") || "";
  const langIso1  = kv.get("lang") || "";

  const client = new DataAPIClient(token);
  const db = client.db(url, { keyspace });

  // Auditoría de colecciones
  const cols = await db.listCollections();
  const exists = cols.some((c: any) => c.name === "system_playbook");
  if (!exists) {
    console.log("ℹ️ No existe la colección system_playbook.");
    return;
  }

  const coll = db.collection("system_playbook");
  const filter: any = {};
  if (promptKey) filter.promptKey = promptKey;
  if (langIso1)  filter.langIso1 = langIso1;

  const cur = await coll.find(filter, { limit: 100 });
  const docs = await cur.toArray();

  if (!docs.length) {
    console.log("ℹ️ Sin resultados para:", filter);
    return;
  }

  for (const d of docs) {
    console.log(`\n===================== ${d._id} =====================`);
    console.log("Meta:", {
      promptKey: d.promptKey,
      category: d.category,
      language: d.language,
      langIso1: d.langIso1,
      version: d.version,
      uploadedAt: d.uploadedAt,
      uploader: d.uploader,
    });
    console.log("\n--- TEXT ---\n");
    console.log(d.text || "(sin texto)");
    console.log("\n=====================================================\n");
  }
}

main().catch((e) => {
  console.error("❌ print_system_playbook error:", e);
  process.exit(1);
});
