import "dotenv/config";
import { searchFromAstra } from "../lib/retrieval";

async function main() {
    const hotelId = process.env.HOTEL_ID || "hotel999";
    const query = process.argv.slice(2).join(" ") || "How do I get an invoice with Tax ID?";
    const lang = process.env.LANG || "en";
    const filters = { category: "billing" as const };
    console.log(`[test-billing] hotelId=${hotelId} lang=${lang} query=\"${query}\"`);
    try {
        const docs = await searchFromAstra(query, hotelId, filters, lang);
        console.log("[test-billing] results count:", docs.length);
        for (let i = 0; i < docs.length; i++) {
            const d = docs[i];
            console.log(`\n#${i + 1}:\n${d}`);
        }
        if (docs.length === 0) process.exitCode = 2;
    } catch (e: any) {
        console.error("[test-billing] error:", e?.message || e);
        process.exitCode = 1;
    }
}

main();
