// scripts/create-test-conversation.ts
import { createConversation } from "../lib/db/conversations"; // ajustá el import según tu estructura real

async function run() {
  const conversation = await createConversation({
    hotelId: "hotel999",
    channel: "web",
    lang: "es",
    guestId: "test-guest-123", // usá un UUID real en producción
    metadata: { prueba: true, ip: "127.0.0.1" },
    status: "active"
  });

  console.log("✅ Conversación creada en AstraDB:");
  console.dir(conversation, { depth: null });
}

run().catch((err) => {
  console.error("❌ Error creando conversación:", err);
  process.exit(1);
});
