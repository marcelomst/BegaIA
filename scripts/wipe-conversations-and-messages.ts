// Path: /root/begasist/scripts/wipe-conversations-and-messages.ts
import * as dotenv from "dotenv";
dotenv.config();

// Usamos import relativo para evitar problemas con los alias TS en scripts CLI
import { getAstraDB } from "../lib/astra/connection";
import { getCassandraClient } from "../lib/astra/connection";

type Args = {
  force: boolean;
  hotel?: string;
  conversation?: string;
  only?:
    | "messages"
    | "conversations"
    | "conv_state"
    | "guests"
    | "guest_aliases"
    | "guest_aliases_by_guest";
};

function parseArgs(argv: string[]): Args {
  const out: Args = { force: false };
  for (const a of argv.slice(2)) {
    if (a === "--force") out.force = true;
    else if (a.startsWith("--hotel=")) out.hotel = a.split("=", 2)[1];
    else if (a.startsWith("--conversation=") || a.startsWith("--conv=")) {
      const v = a.includes("--conv=") ? a.split("=", 2)[1] : a.split("=", 2)[1];
      out.conversation = v;
    }
    else if (a.startsWith("--only=")) {
      const v = a.split("=", 2)[1];
      if (
        v === "messages" ||
        v === "conversations" ||
        v === "conv_state" ||
        v === "guests" ||
        v === "guest_aliases" ||
        v === "guest_aliases_by_guest"
      ) out.only = v as any;
      else {
        console.error(
          `❌ Valor inválido para --only: ${v}. Usa "messages", "conversations", "conv_state", "guests", "guest_aliases" o "guest_aliases_by_guest".`
        );
        process.exit(2);
      }
    }
  }
  return out;
}

async function hasAnyGuestAliasByHotel(table: "guest_aliases", hotelId: string): Promise<boolean> {
  const client = getCassandraClient();
  const query = `SELECT alias FROM ${table} WHERE hotelid = ? LIMIT 1`;
  const res = await client.execute(query, [hotelId], { prepare: true });
  return Boolean(res.first());
}

async function hasAnyGuestAliasesByGuestForCandidates(hotelId: string, guestIds: string[]): Promise<boolean | null> {
  if (!guestIds.length) return null;
  const client = getCassandraClient();
  for (const guestId of guestIds) {
    const query = "SELECT alias FROM guest_aliases_by_guest WHERE hotelid = ? AND guestid = ? LIMIT 1";
    const res = await client.execute(query, [hotelId, guestId], { prepare: true });
    if (res.first()) return true;
  }
  return false;
}

async function hasAnyGuestAliasesByGuestWithFiltering(hotelId: string): Promise<boolean> {
  const client = getCassandraClient();
  const query = "SELECT alias FROM guest_aliases_by_guest WHERE hotelid = ? LIMIT 1 ALLOW FILTERING";
  const res = await client.execute(query, [hotelId], { prepare: true });
  return Boolean(res.first());
}

async function listGuestIdsFromGuestAliases(hotelId: string): Promise<string[]> {
  const client = getCassandraClient();
  const query = "SELECT guestid FROM guest_aliases WHERE hotelid = ?";
  const res = await client.execute(query, [hotelId], { prepare: true });
  const rows = Array.isArray((res as any)?.rows) ? (res as any).rows : [];
  const out = rows
    .map((r: any) => String(r?.get?.("guestid") ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(out));
}

async function main() {
  const args = parseArgs(process.argv);

  const db = getAstraDB();
  const messagesCol = db.collection("messages");
  const conversationsCol = db.collection("conversations");
  const convStateCol = db.collection("conv_state");
  const guestsCol = db.collection("guests");

  const filter: Record<string, any> = {};
  if (args.hotel) filter.hotelId = args.hotel;
  if (args.conversation) filter.conversationId = args.conversation;
  const guestIdCandidates = args.hotel
    ? Array.from(new Set([
        ...(await guestsCol.find({ hotelId: args.hotel }, { projection: { guestId: 1 } }).toArray())
          .map((d: any) => String(d?.guestId ?? "").trim())
          .filter(Boolean),
        ...(await listGuestIdsFromGuestAliases(args.hotel)),
      ]))
    : [];

  const targetCols: Array<{
    name: "messages" | "conversations" | "conv_state" | "guests";
    run: () => Promise<void>;
  }> = [];
  const targetTables: Array<{
    name: "guest_aliases" | "guest_aliases_by_guest";
    run: () => Promise<void>;
  }> = [];

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

  if (!args.only || args.only === "conv_state") {
    targetCols.push({
      name: "conv_state",
      run: async () => {
        if (!args.force) {
          console.log("🧪 [dry-run] Eliminaría documentos de 'conv_state' con filtro:", filter);
          return;
        }
        const res = await convStateCol.deleteMany(filter);
        console.log(`🗑️ conv_state.deleteMany → deletedCount=${res?.deletedCount ?? "?"}`);
      },
    });
  }

  if (!args.only || args.only === "guests") {
    targetCols.push({
      name: "guests",
      run: async () => {
        if (!args.force) {
          console.log("🧪 [dry-run] Eliminaría documentos de 'guests' con filtro:", filter);
          return;
        }
        const res = await guestsCol.deleteMany(filter);
        console.log(`🗑️ guests.deleteMany → deletedCount=${res?.deletedCount ?? "?"}`);
      },
    });
  }

  if (!args.only || args.only === "guest_aliases") {
    targetTables.push({
      name: "guest_aliases",
      run: async () => {
        if (!args.hotel) {
          console.warn("⚠️ guest_aliases requiere --hotel para borrar por partition key. Saltando.");
          return;
        }
        if (!args.force) {
          console.log(`🧪 [dry-run] Ejecutaría DELETE FROM guest_aliases WHERE hotelid='${args.hotel}'`);
          return;
        }
        const client = getCassandraClient();
        await client.execute("DELETE FROM guest_aliases WHERE hotelid = ?", [args.hotel], { prepare: true });
        console.log("🗑️ guest_aliases DELETE por hotelid ejecutado");
      },
    });
  }

  if (!args.only || args.only === "guest_aliases_by_guest") {
    targetTables.push({
      name: "guest_aliases_by_guest",
      run: async () => {
        if (!args.hotel) {
          console.warn("⚠️ guest_aliases_by_guest requiere --hotel para borrar por partition key. Saltando.");
          return;
        }
        if (!args.force) {
          console.log(`🧪 [dry-run] Ejecutaría DELETE FROM guest_aliases_by_guest WHERE hotelid='${args.hotel}' AND guestid in (${guestIdCandidates.length} ids)`);
          return;
        }
        if (!guestIdCandidates.length) {
          console.log("ℹ️ guest_aliases_by_guest: sin guestId candidatos para borrar.");
          return;
        }
        const client = getCassandraClient();
        let deletedPartitions = 0;
        for (const guestId of guestIdCandidates) {
          await client.execute("DELETE FROM guest_aliases_by_guest WHERE hotelid = ? AND guestid = ?", [args.hotel, guestId], {
            prepare: true,
          });
          deletedPartitions += 1;
        }
        console.log(`🗑️ guest_aliases_by_guest DELETE ejecutado por guestid (${deletedPartitions} particiones)`);
      },
    });
  }

  console.log("⚠️ AVISO: Esto borra estado operativo en Astra Data API y tablas CQL.");
  console.log("   Keyspace y URL se toman de tu .env (ASTRA_DB_URL / ASTRA_DB_KEYSPACE).");
  console.log("   Colecciones: 'messages', 'conversations', 'conv_state', 'guests'.");
  console.log("   Tablas CQL: 'guest_aliases', 'guest_aliases_by_guest' (si se provee --hotel).");
  console.log("");
  console.log("➡️ Filtro aplicado:", filter);
  console.log(args.force ? "🚨 MODO: BORRADO REAL (--force)" : "🧪 MODO: DRY-RUN (sin borrar)");

  if (!args.force) {
    console.log("\nℹ️ Tip: ejecutá con --force para borrar de verdad. Opcionales: --hotel=hotel999, --conversation=conv-123, --only=messages|conversations|conv_state|guests|guest_aliases|guest_aliases_by_guest");
  }

  for (const t of targetCols) {
    try {
      console.log(`\n▶ Procesando colección: ${t.name}`);
      await t.run();
    } catch (err) {
      console.error(`❌ Error borrando en ${t.name}:`, err);
    }
  }

  for (const t of targetTables) {
    try {
      console.log(`\n▶ Procesando tabla CQL: ${t.name}`);
      await t.run();
    } catch (err) {
      console.error(`❌ Error borrando en ${t.name}:`, err);
    }
  }

  if (args.hotel) {
    try {
      const hasGuestAliases = await hasAnyGuestAliasByHotel("guest_aliases", args.hotel);
      const hasGuestAliasesByGuest = await hasAnyGuestAliasesByGuestForCandidates(args.hotel, guestIdCandidates);
      const hasGuestAliasesByGuestFiltering =
        hasGuestAliasesByGuest === null
          ? await hasAnyGuestAliasesByGuestWithFiltering(args.hotel)
          : null;
      console.log("\n🔎 Verificación CQL por hotel:", {
        hotelId: args.hotel,
        guest_aliases_has_rows: hasGuestAliases,
        guest_aliases_by_guest_has_rows_for_known_guest_ids: hasGuestAliasesByGuest,
        guest_aliases_by_guest_has_rows_filtering_check: hasGuestAliasesByGuestFiltering,
        guest_id_candidates_checked: guestIdCandidates.length,
      });
    } catch (err) {
      console.warn("⚠️ No se pudo verificar tablas CQL al final:", err);
    }
  }

  console.log("\n✅ Listo.");
}

main().catch((err) => {
  console.error("💥 Error no manejado:", err);
  process.exit(1);
});
