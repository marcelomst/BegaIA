// scripts/show-system-iso3to1.ts
import { getHotelConfig } from "../lib/config/hotelConfig.server";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const config = await getHotelConfig("system");
  if (!config) {
    console.error("❌ No se encontró el registro hotelId=system");
    process.exit(1);
  }
  if (!config.iso3to1) {
    console.warn("⚠️ El campo iso3to1 no existe en hotelId=system");
    process.exit(0);
  }
  console.log("🌎 Mapping iso3to1 en hotelId=system:");
  console.table(config.iso3to1);
}

run().catch(e => {
  console.error("❌ Error:", e);
  process.exit(1);
});
