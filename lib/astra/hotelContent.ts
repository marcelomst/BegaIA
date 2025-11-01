// Path: /root/begasist/lib/astra/hotelContent.ts
import { getAstraCollection } from "./connection";

export type HotelContentType = "playbook" | "standard";

export interface HotelContentRecord {
    _id: string; // compuesto: `${hotelId}:${category}:${promptKey}:${lang}:v${versionNumber}`
    hotelId: string;
    category: string;
    promptKey: string;
    lang: "es" | "en" | "pt";
    versionNumber: number;     // 1, 2, 3...
    versionTag: string;        // "v1", "v2", ...
    type: HotelContentType;
    title?: string;
    body: string;
    createdAt: string;         // ISO
    updatedAt: string;         // ISO
}

export function makeHotelContentId(
    hotelId: string,
    category: string,
    promptKey: string,
    lang: "es" | "en" | "pt",
    versionNumber: number
) {
    return `${hotelId}:${category}:${promptKey}:${lang}:v${versionNumber}`;
}

export function versionTagToNumber(tag?: string | null): number | null {
    if (!tag) return null;
    const m = String(tag).match(/^v(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
}

export async function upsertHotelContent(doc: Omit<HotelContentRecord, "_id" | "createdAt" | "updatedAt">) {
    const collection = await getAstraCollection<HotelContentRecord>("hotel_content");
    const nowIso = new Date().toISOString();
    const _id = makeHotelContentId(doc.hotelId, doc.category, doc.promptKey, doc.lang, doc.versionNumber);
    const exists = await collection.findOne({ _id });
    const record: HotelContentRecord = exists
        ? { ...exists, ...doc, _id, updatedAt: nowIso }
        : { ...doc, _id, createdAt: nowIso, updatedAt: nowIso };

    await collection.updateOne({ _id }, { $set: record }, { upsert: true });
    return { _id };
}

export async function getHotelContent(
    hotelId: string,
    category: string,
    promptKey: string,
    lang: "es" | "en" | "pt",
    versionNumber: number
) {
    const collection = await getAstraCollection<HotelContentRecord>("hotel_content");
    const _id = makeHotelContentId(hotelId, category, promptKey, lang, versionNumber);
    return collection.findOne({ _id });
}

export async function listHotelContentVersions(
    hotelId: string,
    category: string,
    promptKey: string,
    lang: "es" | "en" | "pt"
) {
    const collection = await getAstraCollection<HotelContentRecord>("hotel_content");
    return collection.find({ hotelId, category, promptKey, lang }).toArray();
}
