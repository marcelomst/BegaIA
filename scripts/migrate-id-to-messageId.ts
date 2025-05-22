// scripts/migrate-id-to-messageId.ts
import { getCollection } from "../lib/db/messages";


async function migrateMessageIds() {
  const collection = getCollection();

  const cursor = await collection.find({ id: { $exists: true }, messageId: { $exists: false } });
  const documents = await cursor.toArray();

  console.log(`🔍 Documentos a migrar: ${documents.length}`);

  for (const doc of documents) {
    const { _id, id, ...rest } = doc;

    try {
      await collection.replaceOne(
        { _id },
        {
          ...rest,
          messageId: id,
        }
      );

      console.log(`✅ Migrado _id=${_id} (id → messageId)`);
    } catch (err) {
      console.error(`❌ Error migrando _id=${_id}:`, err);
    }
  }

  console.log("🎉 Migración completa.");
}

migrateMessageIds().catch((err) => {
  console.error("🚨 Error general:", err);
  process.exit(1);
});
