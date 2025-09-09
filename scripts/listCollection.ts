// Path: /root/begasist/scripts/listCollection.ts
import { getAstraDB } from "../lib/astra/connection";

/**
 * Uso:
 *   pnpm tsx scripts/listCollection.ts <collectionName> [hotelId] [--limit=100]
 *
 * Ejemplos:
 *   pnpm tsx scripts/listCollection.ts conversations
 *   pnpm tsx scripts/listCollection.ts conversations hotel999
 *   pnpm tsx scripts/listCollection.ts conv_state hotel999 --limit=20
 */
async function main() {
  const [, , collectionName, hotelIdArg, ...rest] = process.argv;

  if (!collectionName) {
    console.error("❌ Debes indicar el nombre de la colección.");
    console.error("   Ej: pnpm tsx scripts/listCollection.ts conversations hotel999 --limit=50");
    process.exit(1);
  }

  // parseo de --limit
  let limit = 0; // 0 = sin límite
  for (const arg of rest) {
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.split("=")[1]);
      if (!Number.isNaN(n) && n > 0) limit = n;
    }
  }

  const db = getAstraDB();
  const col = db.collection(collectionName);

  // filtro opcional por hotelId (si se pasó segundo argumento)
  const query: Record<string, any> = {};
  if (hotelIdArg) {
    query.hotelId = hotelIdArg;
  }

  console.log("=== Listado ===");
  console.log("Colección:", collectionName);
  if (hotelIdArg) console.log("Filtro hotelId:", hotelIdArg);
  if (limit > 0) console.log("Límite:", limit);
  console.log("------------------------------");

  try {
    const cursor = col.find(query);
    if (limit > 0) cursor.limit(limit);

    let count = 0;
    for await (const doc of cursor) {
      count++;
      console.log(JSON.stringify(doc, null, 2));
      console.log("—".repeat(40));
    }

    // Si querés también el total sin límite:
    // const total = await col.countDocuments(query);
    console.log(`Total devueltos: ${count}`);
  } catch (err) {
    console.error("⚠️ Error al listar:", err);
    process.exit(2);
  }
}

main().then(() => process.exit(0));
