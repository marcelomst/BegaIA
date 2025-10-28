import { getHotelAstraCollection } from "../lib/astra/connection";

type KBChunk = {
    hotelId: string;
    category: string;
    promptKey?: string | null;
    version?: string;
    uploadedAt?: string;
    originalName?: string;
    text?: string;
};

async function main() {
    const hotelId = process.env.HOTEL_ID || "hotel999";
    const collection = getHotelAstraCollection<KBChunk>(hotelId);
    // fetch a page of docs (vector docs usually small page OK). If large, you could paginate.
    const cursor: any = await collection.find({ hotelId }, { limit: 5000 });
    const docs: KBChunk[] = await cursor.toArray();
    const byPrompt = new Map<string, KBChunk[]>();
    const byCategory = new Map<string, KBChunk[]>();
    for (const d of docs) {
        const pk = (d.promptKey ?? "(none)") as string;
        const cat = d.category || "(none)";
        if (!byPrompt.has(pk)) byPrompt.set(pk, []);
        byPrompt.get(pk)!.push(d);
        if (!byCategory.has(cat)) byCategory.set(cat, []);
        byCategory.get(cat)!.push(d);
    }

    const expected = [
        // amenities
        "amenities_list", "breakfast_bar", "parking", "pool_gym_spa", "arrivals_transport",
        // billing/support
        "payments_and_billing", "invoice_receipts", "contact_support",
        // retrieval-based general and rooms
        "kb_general", "room_info", "room_info_img",
    ];
    const present = Array.from(byPrompt.keys()).filter(k => k !== "(none)");
    const missing = expected.filter(k => !present.includes(k));

    const summarize = (arr: KBChunk[]) =>
        arr.slice(0, 3).map(x => `${x.version ?? "?"}@${(x.originalName || "").slice(0, 40)}`).join(", ");

    console.log(`KB inspección de ${hotelId}`);
    console.log("PromptKeys presentes:", present.sort().join(", "));
    console.log("PromptKeys faltantes canónicos:", missing.length ? missing.join(", ") : "(ninguno)");

    console.log("\nPor promptKey (muestra hasta 3):");
    for (const [pk, arr] of Array.from(byPrompt.entries()).sort()) {
        console.log(` - ${pk}: ${arr.length} docs → ${summarize(arr)}`);
    }

    console.log("\nPor categoría:");
    for (const [cat, arr] of Array.from(byCategory.entries()).sort()) {
        const versions = new Set(arr.map(a => a.version || "?"));
        console.log(` - ${cat}: ${arr.length} chunks (versions=${Array.from(versions).join("/")})`);
    }
}

main().catch(err => { console.error("❌ Error inspeccionando KB:", err); process.exit(1); });
