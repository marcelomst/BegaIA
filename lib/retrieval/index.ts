// Path: /root/begasist/lib/retrieval/index.ts

import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";
import { getAstraDB, getHotelAstraCollection, getCassandraClient } from "@/lib/astra/connection";
import { resolveCategoryForHotel } from "@/lib/categories/resolveCategory";
import type { CategoryRegistry } from "@/types/categoryRegistry";
import { normalizeForEmbedding, normalizeLang as normalizeLangCompat } from "@/lib/retrieval/utils";
import { normalizeVersionToNumber, normalizeVersionToTag } from "@/lib/astra/hotelContent";

type LoadDocumentArgs = {
  hotelId: string;
  filePath: string;
  originalName: string;
  uploader?: string;
  mimeType?: string;
  // fuerza category/promptKey (panel o generador)
  enforcedCategory?: string;
  enforcedPromptKey?: string;
  targetLang?: string;
  // metadata libre
  metadata?: Record<string, any>;
};

/**
 * Nombre físico de la colección vectorial por hotel.
 * Ej: hotel999_collection
 */
export function getCollectionName(hotelId: string) {
  return `${hotelId}_collection`;
}

/**
 * Guarda el texto original (pre-chunking) en hotel_text_collection.
 * NO crea la colección: debe existir.
 */
async function saveOriginalTextToAstra(args: {
  hotelId: string;
  originalName: string;
  category?: string;
  promptKey?: string;
  version?: string;
  textContent: string;
  targetLang?: string;
  uploader?: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}) {
  const db = await getAstraDB();
  const coll = db.collection("hotel_text_collection");
  // Documento mínimo compatible con tabla CQL subyacente (evita columnas desconocidas)
  const doc = {
    hotelId: args.hotelId,
    originalName: args.originalName,
    version: args.version,
    // Guardamos como chunk único
    chunkIndex: 0,
    textPart: args.textContent,
    targetLang: args.targetLang,
    uploader: args.uploader,
    uploadedAt: new Date().toISOString(),
  } as const;
  try {
    await coll.insertOne(doc as any);
  } catch (e: any) {
    const msg = String(e?.message || e);
    // Si la colección no existe o el backend es CQL y rechaza columnas, usar fallback CQL
    const shouldFallback = /Collection does not exist/i.test(msg)
      || /Only columns defined in the table schema/i.test(msg)
      || /unknown columns/i.test(msg);
    if (!shouldFallback) throw e;
    // Fallback CQL: insert como un solo chunk en chunkIndex=0
    const client = getCassandraClient();
    const uuid = (globalThis.crypto?.randomUUID?.() || require("crypto").randomUUID?.()) as string;
    const query = `INSERT INTO "${process.env.ASTRA_DB_KEYSPACE}"."hotel_text_collection"
      (id, author, "chunkIndex", "hotelId", "originalName", "targetLang", "textPart", "uploadedAt", uploader, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await client.execute(query, [
      uuid,
      null,
      0,
      args.hotelId,
      args.originalName,
      args.targetLang ?? null,
      args.textContent,
      new Date().toISOString(),
      args.uploader ?? null,
      args.version ?? null,
    ], { prepare: true });
  }
}

/**
 * Intenta registrar la categoría en category_registry si la tabla existe.
 * NO crea la colección; si no existe, se ignora.
 */
async function tryRegisterCategory(category: string, promptKey: string) {
  const db = await getAstraDB();
  const categoryId = `${category}/${promptKey}`;
  const coll = db.collection<CategoryRegistry>("category_registry");
  try {
    const existing = await coll.findOne({ categoryId });
    if (existing) return;
    const now = new Date().toISOString();
    await coll.insertOne({
      categoryId,
      name: promptKey,
      enabled: true,
      router: { category, promptKey },
      retriever: {
        topK: 6,
        filters: {
          category,
          promptKey,
          status: "active",
        },
      },
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
  } catch (e: any) {
    const msg = String(e?.message || e);
    // si la colección no existe, no hacemos nada (modo manual)
    if (/Collection does not exist/i.test(msg)) {
      return;
    }
    // para otros errores sí lanzamos
    throw e;
  }
}

/**
 * Obtiene la próxima versión lógica "vN" por hotel/category/promptKey.
 * Simple: busca en hotel_text_collection el mayor N y suma 1.
 */
async function getNextVersionForCollection(hotelId: string, category: string, promptKey: string, lang?: string): Promise<string> {
  // Prioriza CQL hotel_version_index (evita filtrar por columnas inexistentes en hotel_text_collection)
  try {
    const client = getCassandraClient();
    const q = `SELECT "currentVersion" FROM "${process.env.ASTRA_DB_KEYSPACE}"."hotel_version_index"
               WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=? LIMIT 1`;
    const res = await client.execute(q, [hotelId, category, promptKey, lang ?? 'es'], { prepare: true });
    const row = res.first();
    if (!row) return "v1";
    const prev: string | null = row.get("currentVersion");
    const nextNum = normalizeVersionToNumber(prev ?? undefined) + 1;
    return normalizeVersionToTag(nextNum);
  } catch (e: any) {
    // Si CQL no está disponible, intenta Document API como reserva (solo por hotelId)
    try {
      const db = await getAstraDB();
      const coll = db.collection("hotel_text_collection");
      const cursor = coll.find(
        { hotelId },
        { limit: 1, sort: { uploadedAt: -1 } as any }
      );
      const docs = await cursor.toArray();
      if (!docs.length) return "v1";
      const last = docs[0] as any;
      const prev = typeof last.version === "string" ? last.version : `v${last.version ?? 1}`;
      const num = Number(prev.replace(/^v/i, "")) || 1;
      return `v${num + 1}`;
    } catch {
      return "v1";
    }
  }
}

/**
 * Normaliza texto para embedding (podés ajustar a lo que ya usabas).
 */
/**
 * Traducción dummy: si ya viene en targetLang no hace nada.
 * Podés enchufar acá tu traductor real.
 */
async function translateTextToLang(text: string, targetLang: string) {
  // en tu código real: si lang detectado !== targetLang → llamar LLM/servicio
  return text;
}

/**
 * Clasificación básica por ahora: si viene forzado desde el caller, lo respeta.
 * Si no, podrías meter acá tu classifyFragmentsWithCurationAssistant.
 */
async function classifyChunks(
  docs: Document[],
  enforcedCategory?: string,
  enforcedPromptKey?: string
): Promise<Array<{ category: string; promptKey: string }>> {
  if (enforcedCategory && enforcedPromptKey) {
    return docs.map(() => ({ category: enforcedCategory, promptKey: enforcedPromptKey }));
  }
  // fallback muy simple: retrieval_based/kb_general
  return docs.map(() => ({ category: "retrieval_based", promptKey: "kb_general" }));
}

/**
 * Flujo principal de ingestión de documento
 */
export async function loadDocumentFileForHotel(args: LoadDocumentArgs) {
  const {
    hotelId,
    filePath,
    originalName,
    uploader = "system",
    mimeType = "text/plain",
    enforcedCategory,
    enforcedPromptKey,
    targetLang,
    metadata = {},
  } = args;

  // 1) leer archivo
  const raw = await fs.promises.readFile(filePath, "utf8");

  // 2) idioma objetivo
  // En esta versión, si no se indica targetLang, asumimos 'es'.
  const requestedLang = (targetLang || "es").toLowerCase();
  const lang = (requestedLang === 'es' || requestedLang === 'en' || requestedLang === 'pt') ? (requestedLang as 'es' | 'en' | 'pt') : 'es';

  // 3) traducir si hace falta
  // 3) traducir si hiciera falta (placeholder). En esta versión usamos el texto tal cual
  const textToUse = raw;

  // 4) determinar versión
  const categoryForVersion = enforcedCategory || "retrieval_based";
  const promptKeyForVersion = enforcedPromptKey || "kb_general";
  const nextVersion = await getNextVersionForCollection(hotelId, categoryForVersion, promptKeyForVersion, lang);

  // 5) guardar original
  await saveOriginalTextToAstra({
    hotelId,
    originalName,
    category: categoryForVersion,
    promptKey: promptKeyForVersion,
    version: nextVersion,
    textContent: textToUse,
    targetLang: lang,
    uploader,
    mimeType,
    metadata,
  });

  // 6) chunking
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1500,
    chunkOverlap: 200,
  });
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent: textToUse,
      metadata: {
        hotelId,
        originalName,
      },
    }),
  ]);

  // 7) clasificar chunks (category/promptKey)
  const classifications = await classifyChunks(docs, enforcedCategory, enforcedPromptKey);

  // 8) embeddings + insert en colección vectorial
  const embeddings = new OpenAIEmbeddings();
  const hotelCollectionName = getCollectionName(hotelId);
  const db = await getAstraDB();
  const coll = db.collection(hotelCollectionName);

  let inserted = 0;
  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const { category, promptKey } = classifications[i];
    const cleanText = normalizeForEmbedding(doc.pageContent);
    const vector = await embeddings.embedQuery(cleanText);

    const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${i}`);

    await coll.insertOne({
      _id: id,
      hotelId,
      category,
      promptKey,
      version: nextVersion,
      text: cleanText,
      targetLang: lang,
      $vector: vector,
      doc_json: {
        pageContent: cleanText,
        metadata: {
          category,
          promptKey,
        },
      },
      originalName,
      uploader,
      mimeType,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    } as any);
    inserted++;

    // intento de alta en registry (no crea tabla)
    await tryRegisterCategory(category, promptKey);
  }

  return {
    ok: true,
    count: inserted,
    version: nextVersion,
  };
}


/**
 * Vectoriza todas las plantillas de la KB de un hotel a partir de seeds/category_registry.json
 * Inserta los chunks en la colección vectorial del hotel.
 * Devuelve { indexed, skipped }
 */
export async function vectorizeHotelKb(hotelId: string): Promise<{ indexed: number; skipped: number }> {
  // Cargar seeds/category_registry.json
  const fs = require("fs");
  const path = require("path");
  const registryPath = path.resolve(process.cwd(), "seeds/category_registry.json");
  if (!fs.existsSync(registryPath)) throw new Error("No se encontró seeds/category_registry.json");
  const raw = fs.readFileSync(registryPath, "utf8");
  const registry = JSON.parse(raw);

  let indexed = 0;
  let skipped = 0;
  // Para cada categoría y cada idioma disponible
  for (const entry of registry) {
    if (!entry.enabled || !entry.templates) continue;
    const { categoryId, templates } = entry;
    const [category, promptKey] = categoryId.split("/");
    for (const lang of Object.keys(templates)) {
      const tpl = templates[lang];
      if (!tpl?.body) continue;
      // Usar loadDocumentFileForHotel para vectorizar
      try {
        await loadDocumentFileForHotel({
          hotelId,
          filePath: undefined as any, // No hay archivo físico, usamos el body directo
          originalName: `${categoryId}.${lang}.seed`,
          enforcedCategory: category,
          enforcedPromptKey: promptKey,
          targetLang: lang,
          metadata: { fromSeed: true },
          // Sobrescribir lectura de archivo: pasamos el body directo
          // (hack: sobrecargar fs.promises.readFile temporalmente)
        });
        indexed++;
      } catch (e) {
        skipped++;
      }
    }
  }
  return { indexed, skipped };
}

/**
 * Búsqueda simple en Astra con filtros básicos y compatibilidad de firma.
 * Firma compat:
 *   searchFromAstra(query, hotelId, filters?, userLang?)
 * Retorna array de textos (doc.text)
 */
export async function searchFromAstra(
  query: string,
  hotelId: string,
  filters?: { category?: string; promptKey?: string; targetLang?: string },
  userLang?: string,
  _options?: { forceVectorSearch?: boolean; allowedIds?: string[] }
): Promise<string[]> {
  // Obtiene la colección vectorial del hotel (mockeable en tests)
  const coll = await getHotelAstraCollection(hotelId);

  // Construye filtros básicos
  const base: Record<string, any> = { hotelId };
  const hasCat = !!filters?.category && !!filters?.promptKey;
  if (filters?.category) base.category = filters.category;
  if (filters?.promptKey) base.promptKey = filters.promptKey;

  // Si no se provee targetLang en filtros, y el userLang es soportado, filtra por idioma
  const supported = new Set(['es', 'en', 'pt']);
  const userLangNorm = (userLang || '').toLowerCase();
  const langFilter = filters?.targetLang
    ? (filters!.targetLang)
    : (supported.has(userLangNorm) ? userLangNorm : undefined);
  if (langFilter) base.targetLang = langFilter;

  // Si hay category/promptKey, consultamos registry/overrides para fusionar filtros y topK
  let topK: number | undefined = undefined;
  if (hasCat) {
    try {
      const resolved = await resolveCategoryForHotel({
        hotelId,
        category: String(base.category),
        promptKey: String(base.promptKey),
        desiredLang: typeof base.targetLang === 'string' ? base.targetLang : userLangNorm as any,
      });
      // Tomamos lang efectivo si no se especificó targetLang directamente
      if (!base.targetLang && resolved.lang && supported.has(resolved.lang)) {
        base.targetLang = resolved.lang;
      }
      // Merge de filtros (con whitelist de campos existentes en la colección vectorial)
      const allow = new Set(['hotelId', 'category', 'promptKey', 'targetLang', 'version']);
      const mergedFilters: Record<string, any> = { ...resolved.retriever.filters };
      for (const [k, v] of Object.entries(mergedFilters)) {
        if (!allow.has(k)) delete (mergedFilters as any)[k];
      }
      Object.assign(base, mergedFilters);
      topK = resolved.retriever.topK;
    } catch {
      // si algo falla, seguimos con filtros básicos
    }
  }

  // Si filtramos por categoría, usamos includeSimilarity; limit opcional por topK
  const includeSimilarity = !!base.category;
  const findOptions: any = includeSimilarity ? { includeSimilarity: true } : {};
  if (typeof topK === 'number' && Number.isFinite(topK)) {
    findOptions.limit = topK;
  }
  const rows: any[] = await coll.find(base, findOptions).toArray();

  // Normaliza a array de textos (doc.text) cualquiera sea el shape (anidado o plano)
  const texts: string[] = rows
    .map((r: any) => r?.document?.document ?? r?.document ?? r)
    .map((d: any) => {
      if (typeof d === 'string') return d;
      if (typeof d?.text === 'string') return d.text;
      if (typeof d?.pageContent === 'string') return d.pageContent; // por compatibilidad con LangChain Document
      return undefined;
    })
    .filter((v: any): v is string => typeof v === 'string');

  return texts;
}
