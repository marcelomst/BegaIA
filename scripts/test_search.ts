import { searchFromAstra } from "../lib/retrieval/index";

async function main() {
  const query = "¿Dónde está ubicado el hotel?";
  const hotelId = "demo";
  const category = "retrieval_based";

  const results = await searchFromAstra("consulta", "hotel123", { category: "retrieval_based" });


  console.log("🧠 Resultados relevantes:");
  results.forEach((r, i) => {
    console.log(`\n[${i + 1}] ${r.chunk}\n`);
  });
}

main().catch(console.error);
