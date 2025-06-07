// scripts/update-system-iso3to1.ts
import { updateHotelConfig } from "../lib/config/hotelConfig.server";
import dotenv from "dotenv";
dotenv.config();

async function run() {
  const iso3to1 = {
    spa: "es",
    eng: "en",
    fra: "fr",
    por: "pt",
    ita: "it",
    deu: "de",
    rus: "ru",
    nld: "nl",
    zho: "zh", // chino
    jpn: "ja", // japonés
    kor: "ko", // coreano
    cat: "ca", // catalán
    glg: "gl", // gallego
    eus: "eu", // euskera
    // Agregá todos los que uses aquí
  };

  const result = await updateHotelConfig("system", { iso3to1 });
  console.log("✅ Mapping actualizado en hotelId=system:", result.iso3to1);
}

run().catch(e => {
  console.error("❌ Error:", e);
  process.exit(1);
});
