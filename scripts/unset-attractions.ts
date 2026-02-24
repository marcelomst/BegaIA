import { getHotelConfigCollection } from "@/lib/config/hotelConfig.server";

const hotelId = process.env.HOTEL_ID || "hotel999";

async function run() {
  const col = getHotelConfigCollection();
  await col.updateOne({ hotelId }, { $unset: { attractions: "" } });
  console.log("✅ attractions unset for", hotelId);
}

run().catch((err) => {
  console.error("❌ failed to unset attractions", err);
  process.exit(1);
});
