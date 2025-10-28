// Script de migración: re-etiquetar chunks con category 'reservation' y promptKey relacionados a cancelación a la nueva categoría 'cancellation'
// Uso: npm run ts-node scripts/migrate-reservation-to-cancellation.ts <hotelId>

import { getHotelAstraCollection } from "../lib/astra/connection";

async function main() {
    const hotelId = process.argv[2] || process.env.HOTEL_ID || "hotel999";
    const collection = getHotelAstraCollection<any>(hotelId);

    // Heurística: mover a 'cancellation' los chunks con promptKey que contenga 'cancel'
    const query = {
        hotelId, category: { $in: ["reservation", "retrieval_based", "cancel_reservation"] }, $or: [
            { promptKey: /cancel/i },
            { text: /cancelaci[oó]n|cancelamento|cancellation/i }
        ]
    } as any;
    const cursor = await collection.find(query, { limit: 5000 });
    const docs = await cursor.toArray();
    let updated = 0;
    for (const d of docs) {
        const res = await collection.updateOne({ _id: d._id }, { $set: { category: "cancellation" } });
        if ((res as any)?.modifiedCount) updated += (res as any).modifiedCount;
    }
    console.log(`✅ Migración completada. Documentos re-etiquetados: ${updated}`);
}

main().catch((e) => {
    console.error("❌ Error en migración:", e);
    process.exit(1);
});
