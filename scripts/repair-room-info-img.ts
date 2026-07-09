// Path: /root/begasist/scripts/repair-room-info-img.ts
// Dry-run:
//   pnpm exec tsx scripts/repair-room-info-img.ts --hotelId=hotel999 --lang=es
// Apply:
//   pnpm exec tsx scripts/repair-room-info-img.ts --hotelId=hotel999 --lang=es --apply
import "dotenv/config";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getAstraDB } from "@/lib/astra/connection";
import {
  listHotelContentVersions,
  normalizeVersionToNumber,
  normalizeVersionToTag,
  upsertHotelContent,
} from "@/lib/astra/hotelContent";
import { getCurrentVersionFromIndex, setCurrentVersionInIndex } from "@/lib/astra/hotelVersionIndex";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { generateKbFilesFromTemplates, type Lang } from "@/lib/kb/generator";
import { getCollectionName, loadDocumentFileForHotel } from "@/lib/retrieval";
import type { HotelContent } from "@/types/hotelContent";

const CATEGORY = "retrieval_based";
const PROMPT_KEY = "room_info_img";
const ROOM_INFO_PROMPT_KEY = "room_info";

type Args = {
  hotelId: string;
  lang: Lang;
  apply: boolean;
  targetVersion?: string;
};

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2);
  const hotelId = args.find((arg) => arg.startsWith("--hotelId="))?.split("=")[1] || "hotel999";
  const rawLang = args.find((arg) => arg.startsWith("--lang="))?.split("=")[1] || "es";
  const lang = rawLang === "en" || rawLang === "pt" ? rawLang : "es";
  const targetVersion = args.find((arg) => arg.startsWith("--targetVersion="))?.split("=")[1];
  return {
    hotelId,
    lang,
    apply: args.includes("--apply"),
    targetVersion,
  };
}

function stripVector(doc: Record<string, any>) {
  const { $vector: _vector, vector: _legacyVector, ...rest } = doc;
  return rest;
}

function versionNumber(version: unknown): number {
  return normalizeVersionToNumber(typeof version === "string" || typeof version === "number" ? version : undefined);
}

function sortVersions<T extends { version?: unknown }>(docs: T[]): T[] {
  return [...docs].sort((a, b) => versionNumber(a.version) - versionNumber(b.version));
}

function bodyPreview(body: unknown) {
  return String(body || "").replace(/\s+/g, " ").trim().slice(0, 220);
}

function countHttpUrls(text: string) {
  return (text.match(/https?:\/\/[^\s"')\]]+/gi) || []).length;
}

function countPublicRoomImagePaths(text: string) {
  return (text.match(/\/hotel[a-z0-9_-]+\/[^\s"')\]]+/gi) || []).length;
}

function containsRoomImageSignal(text: string) {
  const body = text.toLowerCase();
  const httpUrlCount = countHttpUrls(text);
  const publicRoomImagePathCount = countPublicRoomImagePaths(text);
  return {
    hasImagesField: /images\s*:/i.test(text),
    httpUrlCount,
    publicRoomImagePathCount,
    containsObjectLeak: text.includes("[object Object]"),
    containsPlaceholder: /\[\[|Completar rooms|Sin imágenes|No images|Sem imagens/i.test(text),
    containsRoomLabels: /Tipo:|Type:|Quartos|Habitaciones|Room types/i.test(text),
    containsRenderableImage: httpUrlCount + publicRoomImagePathCount > 0,
    mentionsMvdPdpTransport: /MVD|PDP|transfer|taxi|bus/i.test(text),
    bodySample: bodyPreview(body),
  };
}

async function readHotelContentState(hotelId: string, promptKey: string, lang: Lang) {
  const docs = await listHotelContentVersions(hotelId, CATEGORY, promptKey, lang);
  return sortVersions(docs as any[]).map((doc) => ({
    _id: doc._id,
    version: doc.version,
    versionTag: doc.versionTag,
    versionNumber: doc.versionNumber,
    type: doc.type,
    title: doc.title,
    updatedAt: doc.updatedAt,
    bodyChars: String(doc.body || "").length,
    ...containsRoomImageSignal(String(doc.body || "")),
  }));
}

async function readIndexState(hotelId: string, promptKey: string, lang: Lang) {
  const idx = await getCurrentVersionFromIndex(hotelId, CATEGORY, promptKey, lang);
  if (!idx) return null;
  return {
    currentVersion: idx.currentVersion,
    lastVersion: idx.lastVersion,
    currentId: idx.currentId,
    lastId: idx.lastId,
    updatedAt: (idx as any).updatedAt,
  };
}

async function readVectorState(hotelId: string, promptKey: string, lang: Lang) {
  const db = await getAstraDB();
  const coll = db.collection(getCollectionName(hotelId));
  const docs = await coll
    .find({ hotelId, category: CATEGORY, promptKey, targetLang: lang })
    .toArray();
  const sanitized = docs.map((doc: any) => stripVector(doc));
  const chunksByVersion = sanitized.reduce<Record<string, number>>((acc, doc) => {
    const version = normalizeVersionToTag(doc.version || doc.vectorVersion || doc.sourceVersion);
    acc[version] = (acc[version] || 0) + 1;
    return acc;
  }, {});
  return {
    chunksByVersion,
    chunks: sortVersions(sanitized as any[]).map((doc: any) => ({
      _id: doc._id,
      version: doc.version,
      sourceVersion: doc.sourceVersion,
      vectorVersion: doc.vectorVersion,
      targetLang: doc.targetLang,
      originalName: doc.originalName,
      uploadedAt: doc.uploadedAt,
      textChars: String(doc.text || "").length,
      ...containsRoomImageSignal(String(doc.text || "")),
    })),
  };
}

async function readState(hotelId: string, lang: Lang) {
  return {
    room_info: {
      index: await readIndexState(hotelId, ROOM_INFO_PROMPT_KEY, lang),
      hotelContent: await readHotelContentState(hotelId, ROOM_INFO_PROMPT_KEY, lang),
      vector: await readVectorState(hotelId, ROOM_INFO_PROMPT_KEY, lang),
    },
    room_info_img: {
      index: await readIndexState(hotelId, PROMPT_KEY, lang),
      hotelContent: await readHotelContentState(hotelId, PROMPT_KEY, lang),
      vector: await readVectorState(hotelId, PROMPT_KEY, lang),
    },
  };
}

function highestVectorVersion(vectorState: Awaited<ReturnType<typeof readVectorState>>) {
  return Object.keys(vectorState.chunksByVersion).reduce((best, version) => {
    return versionNumber(version) > versionNumber(best) ? version : best;
  }, "v0");
}

function chooseTargetVersion(
  indexState: Awaited<ReturnType<typeof readIndexState>>,
  vectorState: Awaited<ReturnType<typeof readVectorState>>,
  explicit?: string
) {
  if (explicit) return normalizeVersionToTag(explicit);
  const current = normalizeVersionToTag(indexState?.currentVersion || "v0");
  const nextFromIndex = normalizeVersionToTag(versionNumber(current) + 1);
  const highestVector = highestVectorVersion(vectorState);
  return versionNumber(highestVector) > versionNumber(current) ? highestVector : nextFromIndex;
}

function extractTitle(body: string): string | undefined {
  const match = body.match(/^\s*#\s+(.+)\s*$/m);
  return match?.[1]?.trim();
}

function assertRepairScope(body: string) {
  if (!/Tipo:|Type:|Imagens:|Images:/i.test(body)) {
    throw new Error("El body generado no parece room_info_img: faltan campos Tipo/Images.");
  }
  if (body.includes("[object Object]")) {
    throw new Error("El body generado contiene [object Object].");
  }
  if (!/https?:\/\//i.test(body) && !/\/hotel[a-z0-9_-]+\//i.test(body)) {
    throw new Error("El body generado no contiene URLs HTTP(S) ni rutas públicas /hotel... renderizables.");
  }
}

function summarizeRoomImages(cfg: any) {
  const rooms = Array.isArray(cfg?.rooms) ? cfg.rooms : [];
  return rooms.map((room: any) => {
    const rawImages = Array.isArray(room?.images) ? room.images : [];
    const images = rawImages.map((image: any) => {
      if (typeof image === "string") {
        return {
          kind: "string",
          value: image,
          isHttp: /^https?:\/\//i.test(image.trim()),
          isPublicRoomPath: /\/public\/hotel[a-z0-9_-]+\//i.test(image) || /^\/hotel[a-z0-9_-]+\//i.test(image.trim()),
        };
      }
      if (image && typeof image === "object") {
        const url = typeof image.url === "string" ? image.url : "";
        return {
          kind: "object",
          url,
          isHttp: /^https?:\/\//i.test(url.trim()),
          isPublicRoomPath: /\/public\/hotel[a-z0-9_-]+\//i.test(url) || /^\/hotel[a-z0-9_-]+\//i.test(url.trim()),
          keys: Object.keys(image).sort(),
        };
      }
      return { kind: typeof image, isHttp: false };
    });
    return {
      name: room?.name,
      type: room?.type,
      imageCount: images.length,
      httpImageCount: images.filter((image: any) => image.isHttp).length,
      publicRoomImagePathCount: images.filter((image: any) => image.isPublicRoomPath).length,
      images,
    };
  });
}

async function buildRoomInfoImgBody(hotelId: string, lang: Lang) {
  const cfg = await getHotelConfig(hotelId);
  if (!cfg) throw new Error(`No existe hotel_config para hotelId=${hotelId}`);
  const files = generateKbFilesFromTemplates({
    hotelConfig: cfg,
    defaultLanguage: lang,
  });
  const key = `${CATEGORY}/${PROMPT_KEY}.${lang}.txt`;
  const body = files[key];
  if (!body) throw new Error(`No se generó ${key}`);
  return body;
}

async function applyRepair(params: {
  hotelId: string;
  lang: Lang;
  body: string;
  targetVersion: string;
}) {
  const { hotelId, lang, body, targetVersion } = params;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "room-info-img-"));
  const filePath = path.join(tmpDir, `${PROMPT_KEY}.${lang}.txt`);
  await fs.writeFile(filePath, body, "utf8");
  try {
    const ingest = await loadDocumentFileForHotel({
      hotelId,
      filePath,
      originalName: `${PROMPT_KEY}.${lang}.txt`,
      enforcedCategory: CATEGORY,
      enforcedPromptKey: PROMPT_KEY,
      targetLang: lang,
      uploader: "repair-room-info-img",
      mimeType: "text/plain",
      versionOverride: targetVersion,
      metadata: {
        category: CATEGORY,
        promptKey: PROMPT_KEY,
        targetLang: lang,
        sourceVersion: targetVersion,
        repairHito: "FIX-ROOM-INFO-IMG-PUBLICATION-ROUTING-RICH-01",
      },
    });
    const versionTag = normalizeVersionToTag(ingest.version || targetVersion);
    const record: HotelContent = {
      hotelId,
      category: CATEGORY,
      promptKey: PROMPT_KEY,
      lang,
      version: versionTag,
      type: "presentation",
      title: extractTitle(body),
      body,
    };
    const hotelContent = await upsertHotelContent(record);
    await setCurrentVersionInIndex({
      hotelId,
      category: CATEGORY,
      promptKey: PROMPT_KEY,
      lang,
      currentVersion: versionTag,
    });
    return {
      ingest,
      versionTag,
      hotelContent,
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const before = await readState(args.hotelId, args.lang);
  const cfg = await getHotelConfig(args.hotelId);
  if (!cfg) throw new Error(`No existe hotel_config para hotelId=${args.hotelId}`);
  const generatedBody = await buildRoomInfoImgBody(args.hotelId, args.lang);
  const targetVersion = chooseTargetVersion(
    before.room_info_img.index,
    before.room_info_img.vector,
    args.targetVersion
  );
  let repairable = true;
  let repairBlocker: string | null = null;
  try {
    assertRepairScope(generatedBody);
  } catch (error: any) {
    repairable = false;
    repairBlocker = error?.message || String(error);
  }

  console.log(JSON.stringify({
    status: args.apply ? "apply_requested" : "dry_run",
    scope: {
      hotelId: args.hotelId,
      category: CATEGORY,
      promptKey: PROMPT_KEY,
      lang: args.lang,
      targetVersion,
      doNotDeleteExistingChunks: true,
    },
    hotelConfigRooms: summarizeRoomImages(cfg),
    generated: {
      bodyChars: generatedBody.length,
      ...containsRoomImageSignal(generatedBody),
    },
    repairable,
    repairBlocker,
    before,
  }, null, 2));

  if (!repairable) {
    if (args.apply) process.exit(1);
    return;
  }

  if (!args.apply) {
    console.log(JSON.stringify({
      dryRun: true,
      wouldApply: {
        hotelContent: { category: CATEGORY, promptKey: PROMPT_KEY, lang: args.lang, version: targetVersion },
        vector: { version: targetVersion, sourceVersion: targetVersion, vectorVersion: targetVersion },
        hotelVersionIndex: { currentVersion: targetVersion },
      },
    }, null, 2));
    return;
  }

  const repair = await applyRepair({
    hotelId: args.hotelId,
    lang: args.lang,
    body: generatedBody,
    targetVersion,
  });
  const after = await readState(args.hotelId, args.lang);
  console.log(JSON.stringify({
    repair,
    after,
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
