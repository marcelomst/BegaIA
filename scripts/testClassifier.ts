// scripts/testClassifier.ts

import { classifyQuery } from "../lib/classifier";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const queries = [
    "¿Qué tipos de habitaciones tienen?",
    "¿Dónde está ubicado el hotel?",
    "Quiero reservar una habitación doble para mañana",
    "¿Puedo pagar con tarjeta de crédito?",
    "¿Tienen restaurante o gimnasio?",
    "Necesito ayuda con mi reserva",
    "¿Aceptan mascotas extraterrestres?"
  ];

  for (const q of queries) {
    const result = await classifyQuery(q);
    console.log(`📝 Consulta: "${q}"`);
    console.log("🔎 Clasificación:", result);
    console.log("───────────────────────────────");
  }
}

main();

