// Path: /root/begasist/scripts/wipe-hotel-collection.ts
import "dotenv/config";
import { getHotelAstraCollection } from "../lib/astra/connection";

async function main() {
    const hotelId = process.env.HOTEL_ID || "hotel999";
    const apply = process.argv.includes("--apply");
    const col = getHotelAstraCollection<any>(hotelId);

    const total = await col.countDocuments({ hotelId }, 1_000_000);
    console.log(`[wipe] Colección: ${hotelId}_collection — documentos del hotel: ${total}`);

    if (!apply) {
        console.log("[wipe] Dry-run ✅ Usa --apply para ejecutar el borrado.");
        return;
    }

    const res = await col.deleteMany({ hotelId });
    console.log(`[wipe] ✅ Eliminados: ${res?.deletedCount ?? 0}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
