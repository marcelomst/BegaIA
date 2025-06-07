// /scripts/test-insert-hotel-text-collection.ts

import { getAstraDB } from "../lib/astra/connection"; // Ajusta el import si es necesario
import { v4 as uuidv4 } from "uuid";

async function testInsert() {
  const client = await getAstraDB();
  const collection = client.collection("hotel_text_collection");
  await collection.insertOne({
    id: uuidv4(),
    author: "test",
    "chunkIndex": 0,
    "hotelId": "hotelTEST",
    "originalName": "doc-test.pdf",
    "textPart": "Texto de prueba",
    "uploadedAt": new Date().toISOString(),
    uploader: "test@begasist.com",
    version: "v1",
  });
  console.log("Insert exitoso");
}

testInsert().catch(console.error);
