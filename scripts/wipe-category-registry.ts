// Wipe all records from category_registry and category_overrides without dropping collections/tables.
// Dry-run by default; use --apply to execute.
import "dotenv/config";
import { getAstraDB, getCassandraClient } from "../lib/astra/connection";

function parseArgs() {
  const args = process.argv.slice(2);
  return { apply: args.includes("--apply") };
}

async function wipeDocCollection(name: string, apply: boolean) {
  const db = await getAstraDB();
  const coll = db.collection(name);
  try {
    let countLogged = false;
    try {
      const count = await coll.countDocuments({}, 1_000_000);
      console.log(`[wipe] Document ${name} → ${count} docs`);
      countLogged = true;
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (!/not supported/i.test(msg)) throw e;
    }
    if (!apply) {
      console.log(`[wipe] Document ${name} DRY-RUN`);
      return;
    }
    if (!countLogged) {
      console.log(`[wipe] Document ${name} → count no soportado (tabla)`);
    }
    const res = await coll.deleteMany({});
    console.log(`[wipe] Document ${name} ✅ eliminados: ${res?.deletedCount ?? 0}`);
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (/Collection does not exist/i.test(msg)) {
      console.log(`[wipe] Document ${name} ↪ no existe (skip)`);
      return;
    }
    console.warn(`[wipe] Document ${name} ↪ error: ${msg}`);
  }
}

async function truncateCqlTable(name: string, apply: boolean) {
  const ks = process.env.ASTRA_DB_KEYSPACE!;
  const client = getCassandraClient();
  const qualified = `"${ks}"."${name}"`;
  console.log(`[wipe] CQL ${name} → TRUNCATE`);
  if (!apply) return;
  try {
    await client.execute(`TRUNCATE ${qualified}`);
    console.log(`[wipe] CQL ${name} ✅ truncada`);
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.warn(`[wipe] CQL ${name} ↪ fallback (${msg})`);
    try {
      if (name === "category_registry") {
        const rs = await client.execute(`SELECT "categoryId" FROM ${qualified}`);
        let n = 0;
        for (const row of rs.rows) {
          await client.execute(`DELETE FROM ${qualified} WHERE "categoryId"=?`, [row.get("categoryId")], { prepare: true });
          n++;
        }
        console.log(`[wipe] CQL ${name} ✅ filas borradas: ${n}`);
      } else if (name === "category_overrides") {
        const rs = await client.execute(`SELECT "hotelId", "categoryId" FROM ${qualified}`);
        let n = 0;
        for (const row of rs.rows) {
          await client.execute(
            `DELETE FROM ${qualified} WHERE "hotelId"=? AND "categoryId"=?`,
            [row.get("hotelId"), row.get("categoryId")],
            { prepare: true }
          );
          n++;
        }
        console.log(`[wipe] CQL ${name} ✅ filas borradas: ${n}`);
      }
    } catch (ee: any) {
      console.error(`[wipe] CQL ${name} ❌ fallback falló:`, ee?.message || ee);
    }
  } finally {
    await client.shutdown().catch(() => {});
  }
}

async function main() {
  const { apply } = parseArgs();
  console.log(`[wipe] category_registry/category_overrides mode=${apply ? "APPLY" : "DRY-RUN"}`);
  await wipeDocCollection("category_registry", apply);
  await wipeDocCollection("category_overrides", apply);
  await truncateCqlTable("category_registry", apply);
  await truncateCqlTable("category_overrides", apply);
  if (!apply) console.log("[wipe] DRY-RUN ✅ Sin cambios. Usa --apply para ejecutar.");
}

main().catch((e) => {
  console.error("[wipe] ❌ Error:", e);
  process.exit(1);
});
