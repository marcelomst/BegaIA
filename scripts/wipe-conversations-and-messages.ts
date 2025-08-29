// Path: /root/begasist/scripts/wipe-conversations-and-messages.ts
import * as dotenv from "dotenv";
dotenv.config();

// Usamos import relativo para evitar problemas con los alias TS en scripts CLI
import { getAstraDB } from "../lib/astra/connection";

type Args = {
  force: boolean;
  hotel?: string;
  only?: "messages" | "conversations";
};

function parseArgs(argv: string[]): Args {
  const out: Args = { force: false };
  for (const a of argv.slice(2)) {
    if (a === "--force") out.force = true;
    else if (a.startsWith("--hotel=")) out.hotel = a.split("=", 2)[1];
    else if (a.startsWith("--only=")) {
      const v = a.split("=", 2)[1];
      if (v === "messages" || v === "conversations") out.only = v;
      else {
        console.error(`❌ Valor inválido para --only: ${v}. Usa "messages" o "conversations".`);
        process.exit(2);
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);

  const db = getAstraDB();
  const messagesCol = db.collection("messages");
  const conversationsCol = db.collection("conversations");

  const filter = args.hotel ? { hotelId: args.hotel } : {};

  const targetCols: Array<{ name: "messages" | "conversations"; run: () => Promise<void> }> = [];

  if (!args.only || args.only === "messages") {
    targetCols.push({
      name: "messages",
      run: async () => {
        if (!args.force) {
          console.log("🧪 [dry-run] Eliminaría documentos de 'messages' con filtro:", filter);
          return;
        }
        const res = await messagesCol.deleteMany(filter);
        console.log(`🗑️ messages.deleteMany → deletedCount=${res?.deletedCount ?? "?"}`);
      },
    });
  }

  if (!args.only || args.only === "conversations") {
    targetCols.push({
      name: "conversations",
      run: async () => {
        if (!args.force) {
          console.log("🧪 [dry-run] Eliminaría documentos de 'conversations' con filtro:", filter);
          return;
        }
        const res = await conversationsCol.deleteMany(filter);
        console.log(`🗑️ conversations.deleteMany → deletedCount=${res?.deletedCount ?? "?"}`);
      },
    });
  }

  console.log("⚠️ AVISO: Esto borra documentos en Astra Data API (JSON Collections).");
  console.log("   Keyspace y URL se toman de tu .env (ASTRA_DB_URL / ASTRA_DB_KEYSPACE).");
  console.log("   Colecciones: 'messages' y 'conversations'.");
  console.log("");
  console.log("➡️ Filtro aplicado:", filter);
  console.log(args.force ? "🚨 MODO: BORRADO REAL (--force)" : "🧪 MODO: DRY-RUN (sin borrar)");

  for (const t of targetCols) {
    try {
      console.log(`\n▶ Procesando colección: ${t.name}`);
      await t.run();
    } catch (err) {
      console.error(`❌ Error borrando en ${t.name}:`, err);
    }
  }

  console.log("\n✅ Listo.");
}

main().catch((err) => {
  console.error("💥 Error no manejado:", err);
  process.exit(1);
});
