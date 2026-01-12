// Path: /scripts/cleanup-hotel-runtime.ts
// Usage examples:
//   pnpm exec tsx -r dotenv/config scripts/cleanup-hotel-runtime.ts --hotelId=hotel999 --backupConfig --cleanHotel123
//   pnpm exec tsx -r dotenv/config scripts/cleanup-hotel-runtime.ts --hotelId=hotel999

import * as fs from "fs";
import * as path from "path";
import { getAstraDB } from "@/lib/astra/connection";

type Args = {
    hotelId: string;
    backupConfig?: boolean;
    cleanHotel123?: boolean;
};

function parseArgs(): Args {
    const args = process.argv.slice(2);
    const out: Args = { hotelId: "" } as any;
    for (const a of args) {
        const [k, v] = a.includes("=") ? (a.split("=") as [string, string]) : [a, "true"];
        if (k === "--hotelId") out.hotelId = v;
        if (k === "--backupConfig") out.backupConfig = v === "true";
        if (k === "--cleanHotel123") out.cleanHotel123 = v === "true";
    }
    if (!out.hotelId) {
        console.error("Missing required --hotelId");
        process.exit(1);
    }
    return out;
}

async function ensureDir(p: string) {
    await fs.promises.mkdir(p, { recursive: true });
}

async function backupConfig(db: any, hotelId: string) {
    const cfg = await db.collection("hotel_config").findOne({ hotelId });
    // category_registry no está scopiado por hotelId; exportamos todo
    const cats = await db.collection("category_registry").find({}).toArray();
    const out = { hotelId, hotel_config: cfg ?? null, category_registry: cats };
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const outDir = path.join("exports");
    await ensureDir(outDir);
    const outPath = path.join(outDir, `backup-${hotelId}-${ts}.json`);
    await fs.promises.writeFile(outPath, JSON.stringify(out, null, 2));
    console.log("Backup written:", outPath, "counts:", { category_registry: cats.length, has_config: !!cfg });
}

async function hasAny(db: any, collection: string, filter: any) {
    const arr = await db.collection(collection).find(filter, { projection: { _id: 1 }, limit: 1 }).toArray();
    return Array.isArray(arr) && arr.length > 0;
}

async function gatherConvStateIds(db: any, hotelId: string) {
    const all = await db.collection("conv_state").find({}, { projection: { _id: 1 } }).toArray();
    const prefix = `${hotelId}:`;
    const ids = (all || []).map((d: any) => d?._id).filter((id: any) => typeof id === "string" && id.startsWith(prefix));
    return ids as string[];
}

async function cleanRuntime(db: any, hotelId: string) {
    const dm = await db.collection("messages").deleteMany({ hotelId });
    const dc = await db.collection("conversations").deleteMany({ hotelId });

    const ids = await gatherConvStateIds(db, hotelId);
    let deletedConvState = 0;
    const BATCH = 100;
    for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH);
        if (!chunk.length) continue;
        const res = await db.collection("conv_state").deleteMany({ _id: { $in: chunk } });
        deletedConvState += res?.deletedCount ?? 0;
    }

    return {
        deletedMessages: dm?.deletedCount ?? 0,
        deletedConversations: dc?.deletedCount ?? 0,
        deletedConvState,
    };
}

async function cleanHotel123Collection(db: any) {
    try {
        const res = await db.collection("hotel123_collection").deleteMany({});
        return res?.deletedCount ?? 0;
    } catch (e) {
        console.warn("hotel123_collection cleanup warn:", (e as any)?.message || e);
        return 0;
    }
}

(async () => {
    const { hotelId, backupConfig: doBackup, cleanHotel123 } = parseArgs();
    const db = getAstraDB();

    if (doBackup) {
        await backupConfig(db, hotelId);
    }

    const before = {
        messages: await hasAny(db, "messages", { hotelId }),
        conversations: await hasAny(db, "conversations", { hotelId }),
    };
    console.log("Presence before (messages/conversations):", before);

    const del = await cleanRuntime(db, hotelId);
    console.log("Deleted:", del);

    let hotel123Deleted = 0;
    if (cleanHotel123) {
        hotel123Deleted = await cleanHotel123Collection(db);
        console.log("hotel123_collection deleted:", hotel123Deleted);
    }

    const after = {
        messages: await hasAny(db, "messages", { hotelId }),
        conversations: await hasAny(db, "conversations", { hotelId }),
    };
    console.log("Presence after (messages/conversations):", after);

    console.log("✔️ Cleanup finished", { hotelId, hotel123Deleted });
    process.exit(0);
})().catch((err) => {
    console.error("Cleanup error:", err);
    process.exit(1);
});
