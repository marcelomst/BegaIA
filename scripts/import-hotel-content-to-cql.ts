// scripts/import-hotel-content-to-cql.ts
import { getAstraDB } from "../lib/astra/connection";
import { readFileSync } from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

async function main() {
    const client = await getAstraDB();
    const collection = client.collection("hotel_content");
    // Limpiar todos los registros existentes antes de recargar
    await collection.deleteMany({});
    console.log("Todos los registros de hotel_content eliminados.");

    // Cargar y recargar los nuevos datos
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const file = path.resolve(__dirname, "../hotel_content.migrated.json");
    const docs = JSON.parse(readFileSync(file, "utf8"));

    let inserted = 0;
    for (const doc of docs) {
        await collection.insertOne(doc);
        inserted++;
    }
    console.log(`✔ Insertados en hotel_content: ${inserted} de ${docs.length}`);
}

main().catch((e) => {
    console.error("Error en importación Astra:", e?.message || e);
    process.exit(1);
});
