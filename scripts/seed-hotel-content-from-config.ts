// Path: /root/begasist/scripts/seed-hotel-content-from-config.ts
// pnpm exec tsx scripts/seed-hotel-content-from-config.ts --hotelId=hotel999
import "dotenv/config";
import { ensureDefaultHotelContentFromConfig } from "../lib/astra/hotelContentSeed";

function parseArgs(argv: string[]) {
    const arr = argv.slice(2);
    const hotelId =
        arr.find((a) => a.startsWith("--hotelId="))?.split("=")[1] ||
        "hotel999"; // default útil para vos ahora
    return { hotelId };
}

(async function main() {
    console.log("[seed-hotel-content] START");
    const { hotelId } = parseArgs(process.argv);
    console.log("[seed-hotel-content] hotelId:", hotelId);

    try {
        const res = await ensureDefaultHotelContentFromConfig(hotelId);
        console.log("[seed-hotel-content] OK:", res);
        console.log("🎯 Listo. Contenido base creado/actualizado para", hotelId);
    } catch (e: any) {
        console.error("❌ Error:", e?.message || e);
        process.exit(1);
    }
})();
