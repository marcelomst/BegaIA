// Path: /scripts/delete-email-messages.ts
//  pnpm exec tsx scripts/delete-email-messages.ts

import * as dotenv from "dotenv";
dotenv.config();

import { getAstraDB } from "../lib/astra/connection";

const MESSAGES_COLLECTION = "messages";
const CONVERSATIONS_COLLECTION = "conversations";
const HOTEL_ID = ""; // O "" para todos los hoteles

async function deleteFromCollection(db: any, collectionName: string, filter: any) {
  const collection = db.collection(collectionName);
  const BATCH_SIZE = 50;
  let deleted = 0;
  let batch = 0;

  while (true) {
    const toDelete = await collection
      .find(filter, { projection: { _id: 1 } })
      .limit(BATCH_SIZE)
      .toArray();

    if (!toDelete.length) break;

    const ids = toDelete.map((doc: any) => doc._id);
    const res = await collection.deleteMany({ _id: { $in: ids } });
    const thisBatch = res.deletedCount || 0;
    deleted += thisBatch;
    batch += 1;
    console.log(`[${collectionName}] Batch #${batch}: eliminados en este batch: ${thisBatch} | Total acumulado: ${deleted}`);
  }

  return deleted;
}

async function main() {
  const db = getAstraDB();

  const baseFilter: any = { channel: "email" };
  if (HOTEL_ID) baseFilter.hotelId = HOTEL_ID;

  const deletedMessages = await deleteFromCollection(db, MESSAGES_COLLECTION, baseFilter);

  const conversationFilter: any = { channel: "email" };
  if (HOTEL_ID) conversationFilter.hotelId = HOTEL_ID;

  const deletedConversations = await deleteFromCollection(db, CONVERSATIONS_COLLECTION, conversationFilter);

  console.log(`✔️ Listo. Eliminados:\n - ${deletedMessages} mensajes de email\n - ${deletedConversations} conversaciones de email${HOTEL_ID ? " para " + HOTEL_ID : ""}.`);
}

main().catch((err) => {
  console.error("Error en el script:", err);
  process.exit(1);
});
