// Path: scripts/wipe-hotel-version.ts
// Delete all documents for a given hotelId and version from:
// - <hotelId>_collection (vectorized chunks)
// - hotel_text_collection (original text chunks)
// Usage:
//   pnpm tsx scripts/wipe-hotel-version.ts --hotel hotel999 --version v4 [--apply]

import "dotenv/config";
import { getHotelAstraCollection } from "../lib/astra/connection";

function parseArgs() {
    const args = process.argv.slice(2);
    const out: Record<string, string | boolean> = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--apply") { out.apply = true; continue; }
        if (a === "--hotel") { out.hotel = args[++i]; continue; }
        if (a === "--version") { out.version = args[++i]; continue; }
    }
    return out as { hotel?: string; version?: string; apply?: boolean };
}

async function main() {
    const { hotel: hotelIdArg, version: versionArg, apply } = parseArgs();
    const hotelId = hotelIdArg || process.env.HOTEL_ID || "hotel999";
    const version = versionArg || process.env.KB_VERSION;
    if (!version) {
        console.error("[wipe] Missing version. Pass --version vN or set KB_VERSION in env.");
        process.exit(2);
    }

    const vecCol = getHotelAstraCollection<any>(hotelId);

    const vecCount = await vecCol.countDocuments({ hotelId, version }, 1_000_000);
    console.log(`[wipe:version] Target hotelId=${hotelId} version=${version}`);
    console.log(`[wipe:version] Vector collection ${hotelId}_collection → ${vecCount} docs`);
    console.log(`[wipe:version] Note: original text (hotel_text_collection) is preserved as requested.`);

    if (!apply) {
        console.log("[wipe:version] Dry-run ✅ Use --apply to execute deletion.");
        return;
    }

    const delVec = await vecCol.deleteMany({ hotelId, version });
    console.log(`[wipe:version] ✅ Deleted vector docs: ${delVec?.deletedCount ?? 0}`);
    console.log(`[wipe:version] ⛔ Skipped deleting hotel_text_collection (kept intact).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
