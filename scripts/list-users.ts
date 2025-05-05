// /scripts/list-users.ts
import { getAllHotelConfigs } from "@/lib/config/hotelConfig.server";

async function main() {
  const hotels = await getAllHotelConfigs();

  for (const hotel of hotels) {
    console.log(`🏨 Hotel: ${hotel.hotelId} (${hotel.hotelName})`);
    if (!hotel.users || hotel.users.length === 0) {
      console.log("   ⚠️  No hay usuarios definidos");
      continue;
    }

    for (const user of hotel.users) {
      console.log(`   👤 ${user.email} — Nivel ${user.roleLevel} — ${user.active ? "✅ Activo" : "❌ Inactivo"}`);
    }
    console.log(""); // Espacio entre hoteles
  }
}

main().catch((err) => {
  console.error("❌ Error al listar usuarios:", err);
});
