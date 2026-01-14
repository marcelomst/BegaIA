// Export hotel_config to a TXT file for manual comparison with KB preview.
// Usage:
//   pnpm exec tsx scripts/export-hotel-config.ts --hotel hotel999
//   pnpm exec tsx scripts/export-hotel-config.ts --hotel hotel999 --out exports/hotel999_hotel_config.txt
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { getHotelConfig } from "../lib/config/hotelConfig.server";

type Args = { hotel: string; out?: string };

function parseArgs(): Args {
  const args = process.argv.slice(2);
  let hotel = process.env.HOTEL_ID || "hotel999";
  let out: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--hotel" && args[i + 1]) {
      hotel = args[++i];
      continue;
    }
    if (a === "--out" && args[i + 1]) {
      out = args[++i];
      continue;
    }
  }
  return { hotel, out };
}

function toTxt(cfg: any, hotelId: string): string {
  const lines: string[] = [];
  lines.push(`# hotel_config export`);
  lines.push(`hotelId: ${hotelId}`);
  lines.push(`exportedAt: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(JSON.stringify(cfg ?? null, null, 2));
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const { hotel, out } = parseArgs();
  const cfg = await getHotelConfig(hotel);
  if (!cfg) {
    console.error(`❌ No se encontró hotel_config para ${hotel}`);
    process.exit(2);
  }
  const txt = toTxt(cfg, hotel);
  const outPath =
    out ||
    path.resolve(process.cwd(), "exports", `${hotel}_hotel_config.txt`);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  await fs.promises.writeFile(outPath, txt, "utf8");
  console.log(`✅ Exportado: ${outPath}`);
}

main().catch((e) => {
  console.error("❌ Error:", e?.message || e);
  process.exit(1);
});
