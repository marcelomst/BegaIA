import { getHotelAstraCollection, getAstraDB } from "../lib/astra/connection";

/**
 * Elimina todos los documentos de la colección `hotel999_collection`.
 * Antes de ejecutar, asegúrate de que las variables de entorno
 * ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_URL y ASTRA_DB_KEYSPACE están configuradas.
 */
(async () => {
    try {
        // Borrar hotel999_collection
        const collection = getHotelAstraCollection('hotel999');
        console.log("Borrando todos los documentos de 'hotel999_collection'…");
        const result = await collection.deleteMany({});
        console.log('✔ Colección hotel999_collection vaciada. Registros eliminados:', result.deletedCount ?? result);

        // Borrar hotel_text_collection para hotelId="hotel999" (tabla, no colección vectorizable)
        const db = getAstraDB();
        const textTable = db.collection('hotel_text_collection');
        console.log("Buscando registros en la tabla 'hotel_text_collection' para hotelId='hotel999'…");
        const docs = await textTable.find({ hotelId: "hotel999" }).toArray();
        let deletedCount = 0;
        for (const doc of docs) {
            if (doc.id) {
                await textTable.deleteOne({ id: doc.id });
                deletedCount++;
            }
        }
        console.log(`✔ Tabla hotel_text_collection: eliminados ${deletedCount} registros para hotelId=hotel999.`);
    } catch (err) {
        console.error('⛔ Error al limpiar las colecciones/tablas:', err);
        process.exit(1);
    }
    process.exit(0);
})();
