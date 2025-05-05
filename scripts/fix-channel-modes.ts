import { DataAPIClient } from "@datastax/astra-db-ts";
import dotenv from "dotenv";

dotenv.config();

const ASTRA_DB_APPLICATION_TOKEN = process.env.ASTRA_DB_APPLICATION_TOKEN!;
const ASTRA_DB_URL = process.env.ASTRA_DB_URL!;
const ASTRA_DB_KEYSPACE = process.env.ASTRA_DB_KEYSPACE!;
const COLLECTION = "hotel_config";

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_URL, { keyspace: ASTRA_DB_KEYSPACE });
const collection = db.collection(COLLECTION);

async function runMigration() {
  const cursor = await collection.find({});
  const configs = await cursor.toArray();

  for (const config of configs) {
    let updated = false;

    for (const key in config.channelConfigs || {}) {
      const mode = config.channelConfigs[key]?.mode;
      if (mode === "manual") {
        config.channelConfigs[key].mode = "supervised";
        updated = true;
      } else if (mode === "auto") {
        config.channelConfigs[key].mode = "automatic";
        updated = true;
      }
    }

    if (updated) {
      await collection.updateOne(
        { hotelId: config.hotelId },
        { $set: { channelConfigs: config.channelConfigs } }
      );
      console.log(`✅ Config actualizada para ${config.hotelId}`);
    } else {
      console.log(`ℹ️ Sin cambios para ${config.hotelId}`);
    }
  }

  console.log("🏁 Migración completada.");
}

runMigration().catch((err) => {
  console.error("⛔ Error durante la migración:", err);
});
