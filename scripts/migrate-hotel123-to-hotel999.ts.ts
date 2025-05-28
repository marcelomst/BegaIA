// /scripts/migrate-hotel123-to-hotel999.ts

import { DataAPIClient } from "@datastax/astra-db-ts";
import * as dotenv from "dotenv";
dotenv.config();

// 🌍 Entorno
const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_URL!, { keyspace: ASTRA_DB_KEYSPACE! });
const SOURCE_COLLECTION = "hotel123_collection";
const TARGET_COLLECTION = "hotel999_collection";
const AUTHOR_EMAIL = "marcelomst1@gmail.com"; // <-- tu email fijo 

async function migrate() {
  const src = db.collection(SOURCE_COLLECTION);
  const dst = db.collection(TARGET_COLLECTION);

  // 1. Leer todos los documentos fuente
  const allDocs = await src.find({}).toArray();
  console.log(`🔍 Docs leídos de origen: ${allDocs.length}`);

  let migrados = 0, skipped = 0, fallidos = 0;

  for (const doc of allDocs) {
    console.log("--------- DOC RAW ----------");
    console.dir(doc, { depth: 10 });

    let vector: any = null;

    // ---- Lógica robusta para extraer el vector ----
    if (doc.doc_json) {
      if (typeof doc.doc_json === "string") {
        try {
          const parsed = JSON.parse(doc.doc_json);
          vector = parsed.$vector;
        } catch (err) {
          console.log("⚠️ Error al parsear doc_json como string:", err);
        }
      } else if (typeof doc.doc_json === "object") {
        vector = doc.doc_json.$vector;
      }
    }

    if (!vector || !Array.isArray(vector) || vector.length !== 1536) {
      console.log(`❌ Sin vector válido, skip: ${doc._id || doc.key}`);
      skipped++;
      continue;
    }

    // Construir documento migrado
    const registroMigrado = {
      key: doc._id || doc.key,
      hotelId: "hotel999",
      category: doc.category || null,
      promptKey: doc.promptKey || null,
      version: "1",
      author: AUTHOR_EMAIL,
      text: doc.text || "",
      query_vector_value: vector,
      uploadedAt: new Date().toISOString(),
      doc_json: typeof doc.doc_json === "string" ? doc.doc_json : JSON.stringify(doc.doc_json),
      originalName: doc.originalName || "unknown"
    };

    try {
      await dst.insertOne(registroMigrado);
      migrados++;
    } catch (err) {
      console.error(`❌ Falló migración de ${registroMigrado.key}:`, err);
      fallidos++;
    }
  }

  console.log(`
✅ Migración finalizada de ${SOURCE_COLLECTION} a ${TARGET_COLLECTION}:
  Migrados: ${migrados}
  Skipped (sin vector válido): ${skipped}
  Fallidos: ${fallidos}
  `);
}

migrate().catch((err) => {
  console.error("🚨 Error general en la migración:", err);
  process.exit(1);
});
