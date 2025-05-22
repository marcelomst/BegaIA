// /scripts/fix-missing-verification-base.ts
import { getAllHotelConfigs, updateHotelConfig } from "../lib/config/hotelConfig.server";

const DEFAULT_BASE = "https://begasist.com/h";

async function run() {
  const hotels = await getAllHotelConfigs();
  const updated: any[] = [];

  for (const hotel of hotels) {
    if (!hotel.verification?.baseUrl) {
      const newBase = `${DEFAULT_BASE}/${hotel.hotelId}`;

      await updateHotelConfig(hotel.hotelId, {
        verification: { baseUrl: newBase },
        lastUpdated: new Date().toISOString(),
      });

      updated.push({
        hotelId: hotel.hotelId,
        hotelName: hotel.hotelName,
        verification: { baseUrl: newBase },
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  if (updated.length === 0) {
    console.log("✅ Todos los hoteles ya tienen baseUrl definido.");
  } else {
    console.log("🔧 Hoteles actualizados:", updated);
  }
}

run();
