// Migration script: enrich existing KB docs in Astra with business identities
// - Adds docGroupId, docId, lang (from targetLang), promptKey (best-effort null), isCurrent based on highest version per (docGroupId, lang)
// - Optionally remaps categories (e.g., "cancellation" -> "cancel_reservation")
// - Computes checksum for dedupe
//
// Usage (optional): ts-node scripts/migrate-kb-to-business-ids.ts --hotelId hotel999 --dry-run
// Notes: This script uses existing Astra helpers from lib/astra/connection (mock signature assumed)

import * as crypto from "crypto";
import { getHotelAstraCollection } from "../lib/astra/connection";
import { buildDocGroupId, buildDocId, normalizeVersion, type LangISO1 } from "../types/kb";

function mapCategory(cat: string | undefined | null): string | null {
    if (!cat) return null;
    if (cat === "cancellation") return "cancel_reservation"; // old -> new
    return cat;
}

function normalizeLang(raw?: string | null): LangISO1 | null {
    const v = (raw || "").toLowerCase();
    if (v.startsWith("es") || v === "spa" || v === "esp" || v === "sp") return "es";
    if (v.startsWith("en") || v === "eng") return "en";
    if (v.startsWith("pt") || v === "por") return "pt";
    return null;
}

function sha256(text: string): string {
    return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function inferPromptKey(category: string, opts: { title?: string | null; originalName?: string | null; text?: string | null }): string | null {
    const title = (opts.title || "").toLowerCase();
    const oname = (opts.originalName || "").toLowerCase();
    const blob = (opts.text || "").toLowerCase();

    // Amenities
    if (category === "amenities") {
        if (/\b(piscina|pool|gimnasio|gym|spa)\b/.test(title) || /\b(piscina|pool|gimnasio|gym|spa)\b/.test(oname)) {
            return "pool_gym_spa";
        }
        if (/\b(desayuno|breakfast|bar)\b/.test(title) || /\b(desayuno|breakfast|bar)\b/.test(oname)) {
            return "breakfast_bar";
        }
        if (/\b(estacionamiento|parking|garage)\b/.test(title) || /\b(estacionamiento|parking|garage)\b/.test(oname)) {
            return "parking";
        }
        // if generic amenities listing
        if (/\bamenities|servicios\b/.test(title) || /\bamenities|servicios\b/.test(oname)) {
            return "amenities_list";
        }
        return null; // leave null if unclear
    }

    // Cancellation (now cancel_reservation)
    if (category === "cancel_reservation") {
        return "cancellation_policy";
    }

    // Billing
    if (category === "billing") {
        if (/\b(invoice|factura|receipt|comprobante)\b/.test(title) || /\b(invoice|factura|receipt|comprobante)\b/.test(oname)) {
            return "invoice_receipts";
        }
        return "payments_and_billing";
    }

    // Default: unknown
    return null;
}

function parseArgs(argv: string[]) {
    const out: Record<string, any> = { "dry-run": true };
    for (let i = 2; i < argv.length; i++) {
        const a = argv[i];
        if (a === "--dry-run") out["dry-run"] = true;
        else if (a === "--no-dry-run") out["dry-run"] = false;
        else if (a === "--hotelId" && i + 1 < argv.length) {
            out.hotelId = argv[++i];
        }
    }
    return out;
}

async function main() {
    const args = parseArgs(process.argv);
    const hotelId = String(args.hotelId || "");
    const dryRun: boolean = Boolean(args["dry-run"]);
    if (!hotelId) {
        console.error("Usage: node migrate-kb-to-business-ids.js --hotelId <id> [--dry-run|--no-dry-run]");
        process.exit(2);
    }

    const collection = getHotelAstraCollection<any>(hotelId);
    const docs = await collection.find({ hotelId }).toArray();

    // Group per (docGroupId, lang) to set isCurrent
    type Key = string; // `${docGroupId}::${lang}`
    const groups = new Map<Key, { version: string; _id: string }[]>();

    for (const doc of docs) {
        const rawCategory = doc.category as string | undefined;
        const category = mapCategory(rawCategory) || "retrieval_based";

        // PromptKey: keep existing if present; else infer based on category/title/originalName
        const inferredPk = inferPromptKey(category, {
            title: doc.doc_json?.title,
            originalName: doc.originalName,
            text: doc.text,
        });
        const promptKey: string | null = (doc.promptKey as string | null) ?? inferredPk ?? null;

        const lang = normalizeLang(doc.targetLang || doc.detectedLang) || "es";

        // Derive a title if present (helps future audits)
        const title: string | null = doc.doc_json?.title ?? null;

        const originalName: string | null = doc.originalName ?? null;
        const basePromptKey = promptKey || (originalName ? originalName.split("_")[0] : "general");

        const docGroupId = buildDocGroupId({ hotelId, category, promptKey: basePromptKey });

        const versionTag = normalizeVersion(doc.version || "v1");
        const docId = buildDocId({ hotelId, category, promptKey: basePromptKey, lang, version: versionTag });

        const checksum = sha256(String(doc.text || ""));

        const updated: any = {
            ...doc,
            category,
            promptKey: promptKey, // may be null
            lang,
            docGroupId,
            docId,
            checksum,
            // keep existing status or set published implicitly
            status: doc.status || "published",
        };

        if (dryRun) {
            console.log("DRY-RUN would update", doc._id, {
                docGroupId,
                docId,
                lang,
                category,
                promptKey: promptKey,
                checksum: checksum.slice(0, 8) + "…",
            });
        } else {
            // Astra Data API does not allow updating _id via $set
            const { _id, ...setDoc } = updated;
            await collection.updateOne({ _id: doc._id }, { $set: setDoc });
        }

        const k: Key = `${docGroupId}::${lang}`;
        const vnum = parseInt(String(versionTag).replace(/^v/i, ""), 10) || 1;
        groups.set(k, [...(groups.get(k) || []), { version: `v${vnum}`, _id: String(doc._id) }]);
    }

    if (!dryRun) {
        // Compute isCurrent per (docGroupId,lang)
        const entries = Array.from(groups.entries());
        for (let i = 0; i < entries.length; i++) {
            const [k, arr] = entries[i];
            const sorted = arr.sort((a, b) => {
                const va = parseInt(a.version.replace(/^v/i, ""), 10);
                const vb = parseInt(b.version.replace(/^v/i, ""), 10);
                return vb - va;
            });
            const latest = sorted[0];
            const parts = k.split("::");
            const docGroupId = parts[0];
            const lang = parts[1];
            await collection.updateMany({ docGroupId, lang }, { $set: { isCurrent: false } });
            await collection.updateOne({ _id: latest._id }, { $set: { isCurrent: true } });
            console.log("Set isCurrent=true for", latest._id, "group", k);
        }
    } else {
        console.log("DRY-RUN: not updating isCurrent flags.");
    }

    console.log("Done.");
}

main().catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
});
