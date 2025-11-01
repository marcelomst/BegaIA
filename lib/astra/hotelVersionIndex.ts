// Path: /root/begasist/lib/astra/hotelVersionIndex.ts
import { getAstraCollection } from "./connection";

export interface HotelVersionIndexRecord {
    _id: string; // `${hotelId}:${category}:${promptKey}:${lang}`
    hotelId: string;
    category: string;
    promptKey: string;
    lang: "es" | "en" | "pt";
    currentVersionNumber: number | null; // 1,2,3...
    currentVersionTag: string | null;    // "v1","v2",...
    currentId?: string | null;           // _id en hotel_content (opcional)
    lastVersionNumber?: number | null;
    lastVersionTag?: string | null;
    lastId?: string | null;
    updatedAt: string;                   // ISO
}

export function makeVersionIndexId(
    hotelId: string,
    category: string,
    promptKey: string,
    lang: "es" | "en" | "pt"
) {
    return `${hotelId}:${category}:${promptKey}:${lang}`;
}

/** Sube la versión actual y mueve la previa a "last*" */
export async function setCurrentVersionInIndex(params: {
    hotelId: string;
    category: string;
    promptKey: string;
    lang: "es" | "en" | "pt";
    currentVersionNumber: number;
    currentVersionTag: string; // "vN"
    currentId?: string;
}) {
    const { hotelId, category, promptKey, lang, currentVersionNumber, currentVersionTag, currentId } = params;
    const collection = await getAstraCollection<HotelVersionIndexRecord>("hotel_version_index");
    const _id = makeVersionIndexId(hotelId, category, promptKey, lang);
    const now = new Date().toISOString();

    const existing = await collection.findOne({ _id });
    if (!existing) {
        const rec: HotelVersionIndexRecord = {
            _id,
            hotelId, category, promptKey, lang,
            currentVersionNumber, currentVersionTag, currentId: currentId ?? null,
            lastVersionNumber: null, lastVersionTag: null, lastId: null,
            updatedAt: now
        };
        await collection.updateOne({ _id }, { $set: rec }, { upsert: true });
        return { _id, created: true };
    }

    const updated: HotelVersionIndexRecord = {
        ...existing,
        lastVersionNumber: existing.currentVersionNumber ?? null,
        lastVersionTag: existing.currentVersionTag ?? null,
        lastId: existing.currentId ?? null,
        currentVersionNumber,
        currentVersionTag,
        currentId: currentId ?? existing.currentId ?? null,
        updatedAt: now
    };

    await collection.updateOne({ _id }, { $set: updated }, { upsert: true });
    return { _id, created: false };
}

export async function getCurrentVersionFromIndex(hotelId: string, category: string, promptKey: string, lang: "es" | "en" | "pt") {
    const collection = await getAstraCollection<HotelVersionIndexRecord>("hotel_version_index");
    const _id = makeVersionIndexId(hotelId, category, promptKey, lang);
    return collection.findOne({ _id });
}
