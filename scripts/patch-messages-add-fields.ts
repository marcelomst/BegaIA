// scripts/patch-messages-add-fields.ts

import { getCollection } from "../lib/db/messages";
import { randomUUID } from "crypto";

async function patchMessagesWithMissingFields() {
  const collection = getCollection();
  const results = await collection.find({}).toArray();

  if (!Array.isArray(results)) {
    console.error("❌ La respuesta de findMany no es un array:", results);
    return;
  }

  let patched = 0;

  for (const msg of results) {
    const update: Record<string, unknown> = {};

    if (!msg.conversationId) update.conversationId = `conv-${randomUUID()}`;
    if (typeof msg.approvedResponse === "undefined") update.approvedResponse = undefined;
    if (typeof msg.respondedBy === "undefined") update.respondedBy = undefined;

    if (Object.keys(update).length > 0) {
      await collection.updateOne({ _id: msg._id }, { $set: update });
      console.log(`✅ Patched messageId: ${msg.messageId ?? msg._id}`);
      patched++;
    }
  }

  console.log(`\n✅ Finalizado. Total mensajes actualizados: ${patched}`);
}

patchMessagesWithMissingFields().catch((err) => {
  console.error("❌ Error actualizando mensajes:", err);
});
