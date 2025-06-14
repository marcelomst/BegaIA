// Path: scripts/update-conversation-subjects.ts

import { getAstraDB } from "../lib/astra/connection";
import * as dotenv from "dotenv";
dotenv.config();

const COLLECTION = "conversations"; // Cambia si tu colección es por hotel, ej: hotel999_collection

async function updateSubjects() {
  const db = getAstraDB();
  const conversations = db.collection(COLLECTION);

  // Solo actualizá las que no tienen subject, o subject vacío
  const all = await conversations.find({
    $or: [
      { subject: { $exists: false } },
      { subject: "" },
      { subject: null }
    ]
  }).toArray();

  let count = 0;
  for (const conv of all) {
    // Podés definir el subject como prefieras
    const newSubject = `Test subject for ${conv.conversationId?.slice?.(0, 8) ?? "no-id"}`;
    await conversations.updateOne(
      { conversationId: conv.conversationId },
      { $set: { subject: newSubject } }
    );
    console.log(`Actualizado ${conv.conversationId}: ${newSubject}`);
    count++;
  }
  console.log(`Total conversations actualizadas: ${count}`);
}

updateSubjects()
  .then(() => {
    console.log("✅ Subjects actualizados en conversations!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("⛔ Error actualizando subjects:", err);
    process.exit(1);
  });
