// /scripts/list-hotel-texts.ts

import { getAstraDB } from "../lib/astra/connection";

async function run() {
  const client = await getAstraDB();
  const collection = client.collection("hotel_text_collection");

  // Opcional: podés filtrar por hotelId si querés
  const docs = await collection.find({}).limit(10).toArray();

  for (const doc of docs) {
    console.log({
      _id: doc._id,
      hotelId: doc.hotelId,
      originalName: doc.originalName,
      version: doc.version,
      uploader: doc.uploader,
      uploadedAt: doc.uploadedAt,
      textContentSnippet: doc.textContent?.slice(0, 100), // solo los primeros 100 chars
    });
  }
}

run();
