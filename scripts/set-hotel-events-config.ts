import { updateHotelConfig } from "@/lib/config/hotelConfig.server";

async function main() {
  const hotelId = "hotel999";
  const updated = await updateHotelConfig(hotelId, {
    eventsRegion: "maldonado_uy",
    globalEventsProvider: "places",
  } as any);

  console.log("[set-hotel-events-config] updated", {
    hotelId: updated.hotelId,
    eventsRegion: (updated as any).eventsRegion,
    globalEventsProvider: (updated as any).globalEventsProvider,
  });
}

main().catch((err) => {
  console.error("[set-hotel-events-config] failed", err);
  process.exit(1);
});
