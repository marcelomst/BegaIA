// Path: /root/begasist/scripts/clean_collections_reservations_and_cm_events.ts

import { getAstraDB } from "../lib/astra/connection";

/**
 * Elimina todos los documentos de las colecciones `reservations` y `cm_events`.
 *
 * Antes de ejecutar, asegúrate de que las variables de entorno
 * ASTRA_DB_APPLICATION_TOKEN, ASTRA_DB_URL y ASTRA_DB_KEYSPACE están configuradas.
 */
async function cleanReservationsAndEvents() {
  const db = getAstraDB();

  const reservations = db.collection("reservations");
  const events = db.collection("cm_events");

  // Si el driver soporta deleteMany, úsalo para borrar todos los documentos de golpe.
  if (typeof reservations.deleteMany === "function" && typeof events.deleteMany === "function") {
    console.log("Borrando todos los documentos de 'reservations' y 'cm_events'…");
    await reservations.deleteMany({});
    await events.deleteMany({});
  } else {
    // En algunos SDKs deleteMany no está disponible, en ese caso eliminamos uno por uno.
    console.log("deleteMany no disponible; borrando documentos individualmente…");

    const resDocs = await reservations.find({}).toArray();
    for (const doc of resDocs) {
      await reservations.deleteOne({ _id: doc._id });
    }

    const evtDocs = await events.find({}).toArray();
    for (const doc of evtDocs) {
      await events.deleteOne({ _id: doc._id });
    }
  }

  console.log("✔ Colecciones 'reservations' y 'cm_events' vaciadas correctamente");
}

cleanReservationsAndEvents().catch((err) => {
  console.error("⛔ Error al limpiar las colecciones:", err);
});
