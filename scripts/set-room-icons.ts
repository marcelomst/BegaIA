/**
 * Agrega rooms[].icon en hotel_config usando una heurística simple.
 * Uso:
 *   pnpm exec tsx scripts/set-room-icons.ts --hotel hotel999        (dry-run)
 *   pnpm exec tsx scripts/set-room-icons.ts --hotel hotel999 --apply (aplica cambios)
 */
import "dotenv/config";
import { getHotelConfig, updateHotelConfig } from "../lib/config/hotelConfig.server";

type Args = { hotel: string; apply: boolean };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let hotel = process.env.HOTEL_ID || "hotel999";
  let apply = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--hotel" && args[i + 1]) { hotel = args[++i]; continue; }
    if (a === "--apply") { apply = true; continue; }
  }
  return { hotel, apply };
}

function pickIcon(room: { name?: string; capacity?: number; beds?: string }): string {
  const name = (room.name || "").toLowerCase();
  if (/(suite|deluxe|premium)/.test(name)) return "✨";
  if (/(twin)/.test(name)) return "👥";
  if (/(triple)/.test(name)) return "👨‍👩‍👧";
  if (/(doble|double|matrimonial|queen|king)/.test(name)) return "🛌";
  if (/(single|individual|simple)/.test(name)) return "🛏️";
  const cap = Number(room.capacity || 0);
  if (cap >= 3) return "🛏️🛏️🛏️";
  if (cap === 2) return "🛏️🛏️";
  return "🛏️";
}

async function main() {
  const { hotel, apply } = parseArgs();
  const cfg = await getHotelConfig(hotel);
  if (!cfg) {
    console.error(`[set-room-icons] ❌ No se encontró hotel_config para ${hotel}`);
    process.exit(1);
  }
  const rooms = Array.isArray(cfg.rooms) ? cfg.rooms : [];
  if (!rooms.length) {
    console.log(`[set-room-icons] No hay rooms para ${hotel}`);
    return;
  }
  const updatedRooms = rooms.map((room: any) => ({ ...room, icon: pickIcon(room) }));

  if (!apply) {
    console.log(`[set-room-icons] DRY-RUN para ${hotel}`);
    updatedRooms.forEach((r: any) => {
      console.log(`- ${r.name || "(sin nombre)"} → icon=${r.icon}`);
    });
    return;
  }

  await updateHotelConfig(hotel, { rooms: updatedRooms } as any);
  console.log(`[set-room-icons] ✅ Actualizado rooms[].icon para ${hotel}`);
}

main().catch((e) => {
  console.error("[set-room-icons] ❌ Error:", e);
  process.exit(1);
});
