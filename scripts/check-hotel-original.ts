// Path: scripts/check-hotel-original.ts
import "dotenv/config";
import { getOriginalTextChunksFromAstra } from "../lib/astra/hotelTextCollection";

function parseArgs() {
    const args = process.argv.slice(2);
    const out: Record<string, string> = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === "--hotel") out.hotel = args[++i];
        else if (a === "--name") out.name = args[++i];
        else if (a === "--version") out.version = args[++i];
    }
    return out as { hotel?: string; name?: string; version?: string };
}

async function main() {
    const { hotel, name, version } = parseArgs();
    const hotelId = hotel || process.env.HOTEL_ID || "hotel999";
    if (!name || !version) {
        console.error("Usage: pnpm tsx scripts/check-hotel-original.ts --hotel <hotelId> --name <originalName> --version <vN>");
        process.exit(2);
    }
    const chunks = await getOriginalTextChunksFromAstra({ hotelId, originalName: name, version });
    if (!chunks?.length) {
        console.log(`[check] No chunks found for hotelId=${hotelId} name=${name} version=${version}`);
        return;
    }
    const ordered = chunks
        .map((c: any) => ({ idx: c.chunkIndex ?? 0, text: c.textPart ?? "" }))
        .sort((a, b) => a.idx - b.idx);
    console.log(`[check] Found ${ordered.length} chunks:`);
    for (const c of ordered) {
        console.log(`  - chunkIndex=${c.idx} length=${c.text.length}`);
    }
    const preview = ordered.map((c) => c.text).join("").slice(0, 300);
    console.log("[check] Preview (first 300 chars):\n" + preview);
}

main().catch((e) => { console.error(e); process.exit(1); });
