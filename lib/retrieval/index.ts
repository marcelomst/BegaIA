// Path: /root/begasist/lib/retrieval/index.ts
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { translationModel } from "../../app/lib/translation";
import { debugLog } from "../utils/debugLog";
import { validateClassification } from "./validateClassification";
import fs from "fs";
import { cosineSimilarity } from "../utils/similarity";
import type { InsertableChunk, SearchFilters } from "../../types/chunk";
import pdfParse from "pdf-parse";
import { getHotelAstraCollection } from "../astra/connection";
import { getHotelConfig } from "../config/hotelConfig.server";
import { franc } from "franc";
import { iso3To1 } from "@/lib/utils/lang";
import { saveOriginalTextChunksToAstra } from "../astra/hotelTextCollection";
import { getNextVersionForSystemPlaybook, upsertSystemPlaybookDoc } from "@/lib/astra/systemPlaybook";

// --- helpers ---
export function getCollectionName(hotelId: string) {
  return `${hotelId}_collection`;
}
async function getNextVersionForCollection(
  collection: any,
  hotelId: string,
  opts: { category?: string; promptKey?: string; targetLang?: string } = {}
) {
  const filter: Record<string, any> = { hotelId };
  if (typeof opts.category === 'string' && opts.category.trim()) filter.category = opts.category.trim();
  if (typeof opts.promptKey === 'string' && opts.promptKey.trim()) filter.promptKey = opts.promptKey.trim();
  if (typeof opts.targetLang === 'string' && opts.targetLang.trim()) filter.targetLang = opts.targetLang.trim();
  const docs = await collection.find(filter).toArray();
  let maxVersion = 0;
  for (const doc of docs) {
    const m = (doc.version || "").match(/^v(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxVersion) maxVersion = n;
    }
  }
  if (maxVersion > 0) {
    debugLog(`[Versioning] Versión actual encontrada para combinación: ${JSON.stringify(filter)} → v${maxVersion}`);
  } else {
    debugLog(`[Versioning] No existe versión previa para combinación: ${JSON.stringify(filter)}. Se usará v1.`);
  }
  return `v${maxVersion + 1}`;
}

const curationAssistant = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0,
});

const classificationPrompt = `
Eres un experto en hospitalidad. Vas a clasificar fragmentos de texto provenientes de documentos de hoteles en una de las siguientes categorías:

- reservation
- cancellation
- billing
- support
- amenities
- retrieval_based

Además, si corresponde, asignarás una clave de prompt especializada (promptKey) como por ejemplo: room_info, cancellation_policy, breakfast_details, etc. Si no hay un promptKey aplicable, devuélvelo como null.

Devuelve **exclusivamente** un JSON válido con esta estructura (una lista con un objeto por fragmento):

[
  {
    "category": "reservation",
    "promptKey": "cancellation_policy"
  },
  ...
]

Ahora analiza los siguientes fragmentos:

{fragments}
`;

// Traducción robusta a cualquier idioma destino (usada abajo)
export async function translateTextToLang(text: string, lang: string) {
  try {
    const translated = await translationModel(text, lang);
    if (typeof translated.content === "string") {
      return translated.content;
    }
    return JSON.stringify(translated.content);
  } catch (err) {
    debugLog("❌ Error en traducción:", err);
    return text; // fallback al texto original
  }
}
/**
 * Carga de documentos desde admin.
 * - Hotel normal: ingesta con chunks + embeddings (como tenías).
 * - Modo system (hotelId === "system"): un único doc plano en `system_playbook` (sin embeddings),
 *   usando category/promptKey del form.
 */
export async function loadDocumentFileForHotel({
  hotelId,
  filePath,
  originalName,
  uploader,
  mimeType,
  metadata = {},
}: {
  hotelId: string;
  filePath: string;
  originalName: string;
  uploader: string;
  mimeType?: string;
  metadata?: Record<string, any>;
}) {
  // 1. Leer y extraer texto (PDF o TXT)
  let text = "";
  if (mimeType?.includes("pdf") || filePath.endsWith(".pdf")) {
    const buffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(buffer);
    text = pdfData.text;
  } else if (mimeType?.includes("text") || filePath.endsWith(".txt")) {
    text = fs.readFileSync(filePath, "utf8");
  } else {
    throw new Error("Formato no soportado. Solo PDF/TXT por ahora.");
  }

  // Helper local para normalizar ISO1 soportado
  function normalizeLang(raw?: string | null): "es" | "en" | "pt" | "other" {
    const v = (raw || "").toLowerCase();
    if (v.startsWith("es") || v === "spa" || v === "esp" || v === "sp") return "es";
    if (v.startsWith("en") || v === "eng") return "en";
    if (v.startsWith("pt") || v === "por") return "pt";
    return "other";
  }

  // 2. Detección de idioma y target (respetando metadata del uploader si llega)
  let translatedText = text;
  let detectedLang3 = "und";
  let detectedIso1: string = "und";
  let detectedLangScore: number | null = null;
  let targetLang: "es" | "en" | "pt" = "es";
  try {
    const config = await getHotelConfig(hotelId);
    const cfgDefault = normalizeLang(config?.defaultLanguage);
    const incomingDetected = typeof metadata.detectedLang === 'string' ? metadata.detectedLang : undefined;
    const incomingTarget = typeof metadata.targetLang === 'string' ? metadata.targetLang : undefined;
    const incomingScore = typeof metadata.detectedLangScore === 'number' ? metadata.detectedLangScore : null;

    if (!incomingDetected) {
      detectedLang3 = franc(text);
      detectedIso1 = await iso3To1(detectedLang3);
    } else {
      detectedIso1 = normalizeLang(incomingDetected);
    }
    detectedLangScore = incomingScore;

    const normIncomingTarget = normalizeLang(incomingTarget);
    targetLang = (["es", "en", "pt"] as const).includes(normIncomingTarget as any)
      ? normIncomingTarget as any
      : (cfgDefault === 'other' ? 'es' : cfgDefault);

    if (detectedIso1 !== 'und' && detectedIso1 !== 'other' && detectedIso1 !== targetLang) {
      translatedText = await translateTextToLang(text, targetLang || 'es');
    }
  } catch (err) {
    debugLog("⚠️ No se pudo obtener idioma destino desde config o traducir:", err);
  }

  // 🔀 MODO SYSTEM: insertar directo en `system_playbook` sin embeddings
  if (hotelId === "system") {
    const promptKey = metadata.promptKey;
    const category = metadata.category;
    if (!promptKey || typeof promptKey !== "string") {
      throw new Error("En modo system, el formulario debe incluir 'promptKey'.");
    }
    if (!category || typeof category !== "string") {
      throw new Error("En modo system, el formulario debe incluir 'category'.");
    }
    const now = new Date().toISOString();
    const langIso1 = targetLang || "es";
    const version = await getNextVersionForSystemPlaybook(promptKey, langIso1);
    const _id = `spb-${promptKey}-${version}-${langIso1}`;

    await upsertSystemPlaybookDoc({
      _id,
      text: translatedText || text,
      category,
      promptKey,
      language: "spa",
      langIso1,
      version,
      uploader,
      author: metadata.author ?? null,
      uploadedAt: now,
      notes: metadata.notes ?? undefined,
    });

    return { ok: true, mode: "system", _id, version };
  }

  // 3. Guardar texto original en hotel_text_collection (en chunks de 8000 caracteres)
  const now = new Date().toISOString();
  const collection = getHotelAstraCollection<InsertableChunk>(hotelId);
  // Use normalized category, promptKey, and targetLang for versioning
  const versionTag = await getNextVersionForCollection(
    collection,
    hotelId,
    {
      category: typeof metadata.category === 'string' && metadata.category.trim() ? metadata.category.trim() : undefined,
      promptKey: typeof metadata.promptKey === 'string' && metadata.promptKey.trim() ? metadata.promptKey.trim() : undefined,
      targetLang,
    }
  );
  await saveOriginalTextChunksToAstra({
    hotelId,
    originalName,
    version: versionTag || 'v1',
    uploader,
    author: metadata.author ?? null,
    uploadedAt: now,
    textContent: text, // el texto crudo antes de chunkear
    category: typeof metadata.category === 'string' && metadata.category.trim() ? metadata.category.trim() : undefined,
    promptKey: typeof metadata.promptKey === 'string' && metadata.promptKey.trim() ? metadata.promptKey.trim() : undefined,
    targetLang,
  });

  // 4. Chunking
  // Normalización ligera SOLO para embeddings (preservamos el original tal cual):
  // - si el primer heading H1 (# ...) está duplicado al inicio, dejar solo uno
  // - opcionalmente, colapsar saltos de línea múltiples en el frontmatter inmediato
  function normalizeForEmbedding(input: string): string {
    const lines = input.replace(/\r\n?/g, "\n").split("\n");
    // localizar primer línea no vacía
    let i = 0;
    while (i < lines.length && lines[i].trim() === "") i++;
    if (i < lines.length) {
      const first = lines[i];
      const firstTrim = first.trim();
      // si primer no-vacía es un H1
      if (firstTrim.startsWith("# ")) {
        // buscar próxima no-vacía y si es idéntica, eliminar duplicados consecutivos del mismo heading
        let j = i + 1;
        while (j < lines.length && lines[j].trim() === "") j++;
        // eliminar todas las repeticiones idénticas del heading en el arranque
        while (j < lines.length && lines[j].trim() === firstTrim) {
          lines.splice(j, 1); // quitar la repetida
          // mantener j en la misma posición para revisar si hay otra repetición seguida
          while (j < lines.length && lines[j].trim() === "") j++;
        }
      }
    }
    // opcional: colapsar más de 2 saltos de línea consecutivos a 2 en el prefacio
    return lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  const textForEmbedding = normalizeForEmbedding(translatedText);
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
  const chunks = await splitter.createDocuments([textForEmbedding]);

  // 5. Clasificación de chunks
  const enrichedChunks = await classifyFragmentsWithCurationAssistant(chunks);

  // 5.b Normalización de categoría/promptKey: si el uploader proporcionó category/promptKey,
  // forzamos esos valores en TODOS los chunks para evitar drift entre top-level y por-fragmento.
  // Esto respeta la gobernanza: el admin decide el promptKey (curado) y la category.
  const enforcedCategory = typeof metadata.category === 'string' && metadata.category.trim() ? metadata.category.trim() : undefined;
  const enforcedPromptKey = typeof metadata.promptKey === 'string' && metadata.promptKey.trim() ? metadata.promptKey.trim() : undefined;
  const normalizedChunks = enrichedChunks.map((doc) =>
    new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        ...(enforcedCategory ? { category: enforcedCategory } : {}),
        ...(enforcedPromptKey ? { promptKey: enforcedPromptKey } : {}),
      },
    })
  );

  // 6. Vectorización y guardado
  const embedder = new OpenAIEmbeddings();
  for (const [i, doc] of normalizedChunks.entries()) {
    const embedding = await embedder.embedQuery(doc.pageContent);
    const record = {
      hotelId,
      category: (enforcedCategory || doc.metadata.category || metadata.category || "retrieval_based"),
      promptKey: (enforcedPromptKey ?? doc.metadata.promptKey ?? metadata.promptKey ?? null),
      version: versionTag,
      author: metadata.author ?? null,
      uploader,
      text: doc.pageContent,
      $vector: embedding,
      uploadedAt: now,
      // doc_json: JSON string con shape estable y sin duplicidad/conflicto de claves
      doc_json: JSON.stringify({
        pageContent: doc.pageContent,
        metadata: {
          ...(doc.metadata || {}),
          // Garantizar consistencia en metadata
          category: (enforcedCategory || doc.metadata?.category || metadata.category || "retrieval_based"),
          promptKey: (enforcedPromptKey ?? doc.metadata?.promptKey ?? metadata.promptKey ?? null),
          loc: undefined,
        },
        loc: undefined,
        chunkIndex: i,
        originalName,
        uploader,
        mimeType,
        uploadedAt: now,
        version: versionTag,
        detectedLang: detectedIso1,
        detectedLangScore,
        targetLang,
      }),
      originalName,
      detectedLang: detectedIso1,
      detectedLangScore,
      targetLang,
    };
    await collection.insertOne(record);
  }

  return { ok: true, count: enrichedChunks.length, version: versionTag };
}


// --- helpers de clasificación (sin cambios) ---
async function classifyFragmentsWithCurationAssistant(documents: Document[]): Promise<Document[]> {
  const inputChunks = documents.map((doc) => doc.pageContent);
  const promptText = classificationPrompt.replace(
    "{fragments}",
    inputChunks.map((t, i) => `Fragmento ${i + 1}: """${t}"""`).join("\n\n")
  );
  fs.writeFileSync("prompt-clasificador.txt", promptText, "utf8");
  console.log("🧠 Prompt guardado en prompt-clasificador.txt");

  const response = await curationAssistant.invoke([{ role: "user", content: promptText }]);

  function extractTextContent(content: any): string {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content.map((c) => c?.text || "").join("\n");
    }
    return JSON.stringify(content);
  }

  let parsed: any[] = [];
  try {
    parsed = JSON.parse(extractTextContent(response.content) || "[]");
  } catch (e) {
    debugLog("⛔ Error al parsear JSON del clasificador:", e);
  }
  fs.writeFileSync("parsed-completo.json", JSON.stringify(parsed, null, 2));

  return documents.map((doc, i) => {
    const classification = validateClassification(parsed[i] || {});
    return new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        category: classification.category,
        promptKey: classification.promptKey,
      },
    });
  });
}

/** ========= 🔽 Helpers que faltaban (usados en loadDocuments) 🔽 ========= */
async function fetchPageWithPuppeteer(url: string): Promise<string | null> {
  const puppeteer = (await import("puppeteer-extra")).default;
  debugLog("🌐 Cargando página con Puppeteer:", url);
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: "networkidle2", timeout: 120000 });
    await page.waitForSelector("body", { timeout: 120000 });
    return await page.evaluate(() => document.body.innerText);
  } catch (error) {
    debugLog("❌ Error en Puppeteer:", error);
    return null;
  } finally {
    await browser.close();
  }
}

export async function translateText(text: string) {
  try {
    const lang = process.env.SYSTEM_NATIVE_LANGUAGE || "es";
    const translated = await translationModel(text, lang);
    return typeof translated.content === "string"
      ? translated.content
      : JSON.stringify(translated.content);
  } catch (error) {
    debugLog("⛔ Error en traducción:", error);
    return text;
  }
}

/** ========= 🔽 loadDocuments + searchFromAstra (sin cambios funcionales) 🔽 ========= */
export async function loadDocuments(
  hotelId: string,
  opts: { version?: string } = {}
) {
  debugLog(`📦 Cargando documentos para hotel ${hotelId}`);
  const urls = ["https://www.hoteldemo.com/en/index.php"];

  const version = opts.version ?? "v1";

  const docs = await Promise.all(
    urls.map(async (url) => {
      const html = await fetchPageWithPuppeteer(url);
      if (!html) return null;
      const translated = await translateText(html);
      return new Document<{ source: string; hotelId: string }>({
        pageContent: translated,
        metadata: { source: url, hotelId },
      });
    })
  );

  const validDocs = docs.filter((d): d is Document<{ source: string; hotelId: string }> => d !== null);

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1500, chunkOverlap: 200 });
  const chunks = await splitter.splitDocuments(validDocs);

  const enrichedChunks = await classifyFragmentsWithCurationAssistant(chunks);

  const embedder = new OpenAIEmbeddings();
  const collection = getHotelAstraCollection<InsertableChunk>(hotelId);

  for (const doc of enrichedChunks) {
    const embedding = await embedder.embedQuery(doc.pageContent);
    if (!doc.metadata.hotelId || !doc.metadata.category) {
      throw new Error("Faltan hotelId o category en el metadata del chunk.");
    }
    await collection.insertOne({
      hotelId,
      category: doc.metadata.category || "retrieval_based",
      promptKey: doc.metadata.promptKey ?? null,
      text: doc.pageContent,
      $vector: embedding,
      version,
      ...doc.metadata,
    });
  }

  debugLog(`✅ Insertados ${enrichedChunks.length} chunks en colección ${hotelId}_collection`);
}

async function getLatestVersionForHotel(collection: any, hotelId: string) {
  const docs = await collection.find({ hotelId }).toArray();
  const byVersion = new Map<string, { version: string; uploadedAt: string }>();
  for (const doc of docs) {
    if (
      !byVersion.has(doc.version) ||
      new Date(doc.uploadedAt) > new Date(byVersion.get(doc.version)!.uploadedAt)
    ) {
      byVersion.set(doc.version, { version: doc.version, uploadedAt: doc.uploadedAt });
    }
  }
  const grouped = Array.from(byVersion.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  return grouped[0]?.version;
}

// 🆕 Versión más reciente por categoría (si la consulta trae category)
async function getLatestVersionForHotelCategory(collection: any, hotelId: string, category: string) {
  const docs = await collection.find({ hotelId, category }).toArray();
  const byVersion = new Map<string, { version: string; uploadedAt: string }>();
  for (const doc of docs) {
    if (
      !byVersion.has(doc.version) ||
      new Date(doc.uploadedAt) > new Date(byVersion.get(doc.version)!.uploadedAt)
    ) {
      byVersion.set(doc.version, { version: doc.version, uploadedAt: doc.uploadedAt });
    }
  }
  const grouped = Array.from(byVersion.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  return grouped[0]?.version;
}

// 🆕 Versión más reciente por promptKey (si la consulta trae promptKey)
async function getLatestVersionForHotelPromptKey(collection: any, hotelId: string, promptKey: string) {
  const docs = await collection.find({ hotelId, promptKey }).toArray();
  const byVersion = new Map<string, { version: string; uploadedAt: string }>();
  for (const doc of docs) {
    if (
      !byVersion.has(doc.version) ||
      new Date(doc.uploadedAt) > new Date(byVersion.get(doc.version)!.uploadedAt)
    ) {
      byVersion.set(doc.version, { version: doc.version, uploadedAt: doc.uploadedAt });
    }
  }
  const grouped = Array.from(byVersion.values()).sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  return grouped[0]?.version;
}

export async function searchFromAstra(
  query: string,
  hotelId: string = "hotel999",
  filters: SearchFilters = {},
  userLang?: string,
  options?: { forceVectorSearch?: boolean, allowedIds?: string[] }
) {
  if (!hotelId || hotelId === "hotel999") {
    console.warn("⚠️ [searchFromAstra] hotelId no proporcionado, usando fallback: 'hotel999'");
  }
  const embedder = new OpenAIEmbeddings();
  const queryVector = await embedder.embedQuery(query);

  const collection = getHotelAstraCollection<any>(hotelId);

  // 👉 Nueva lógica de versión (sensible a categoría)
  let version = filters.version;
  // Preferir versión más reciente específica del promptKey si fue provisto
  if (!version && filters.promptKey) {
    version = await getLatestVersionForHotelPromptKey(collection, hotelId, filters.promptKey);
    debugLog("🔄 Usando versión más reciente por promptKey:", filters.promptKey, "→", version);
  }
  if (!version && filters.category) {
    version = await getLatestVersionForHotelCategory(collection, hotelId, filters.category);
    debugLog("🔄 Usando versión más reciente por categoría:", filters.category, "→", version);
  }
  if (!version) {
    version = await getLatestVersionForHotel(collection, hotelId);
    debugLog("🔄 Usando versión más reciente global:", version);
  }
  const baseFilter: Record<string, any> = { hotelId };
  // if (version) baseFilter.version = version;
  console.log("🔄 Usando filtro base:", baseFilter);
  // Filtro opcional por idioma destino de indexación
  function normalizeLang(raw?: string | null): "es" | "en" | "pt" | "other" {
    const v = (raw || "").toLowerCase();
    if (v.startsWith("es") || v === "spa" || v === "esp" || v === "sp") return "es";
    if (v.startsWith("en") || v === "eng") return "en";
    if (v.startsWith("pt") || v === "por") return "pt";
    return "other";
  }
  const normalizedUser = normalizeLang(userLang);
  const targetLang = (typeof filters.targetLang === 'string' && ["es", "en", "pt"].includes(filters.targetLang))
    ? filters.targetLang
    : (["es", "en", "pt"].includes(normalizedUser) ? normalizedUser : undefined);
  if (targetLang) baseFilter.targetLang = targetLang;

  // Si se fuerza búsqueda vectorial, ignorar promptKey/category y devolver chunks completos
  if (options?.forceVectorSearch) {
    debugLog("[searchFromAstra] Forzando búsqueda SOLO por similitud vectorial, ignorando promptKey/category");
    // Si se pasan allowedIds, filtrar por esos _id
    let filter = { ...baseFilter };
    if (options.allowedIds && Array.isArray(options.allowedIds) && options.allowedIds.length > 0) {
      filter._id = { $in: options.allowedIds };
    }
    const vectorCursor = await collection.find(filter, {
      sort: { $vector: queryVector },
      limit: 50,
      includeSimilarity: true,
    });
    const vectorResults = await vectorCursor.toArray();
    debugLog('[searchFromAstra] Chunks recuperados (sin filtrar):', vectorResults.map(r => ({ text: r.text, similarity: r.$similarity, category: r.category, promptKey: r.promptKey, detectedLang: r.detectedLang, version: r.version, _id: r._id })));
    // Agrupar por category+promptKey+detectedLang y tomar el chunk con la versión más alta
    const grouped: Record<string, any[]> = {};
    for (const chunk of vectorResults) {
      const key = `${chunk.category ?? ''}|${chunk.promptKey ?? ''}|${chunk.detectedLang ?? ''}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(chunk);
    }
    // Para cada grupo, tomar el chunk con la versión más alta (alfabéticamente o por fecha si disponible)
    const latestChunks = Object.values(grouped).map(group => {
      return group.reduce((max, curr) => {
        if (curr.uploadedAt && max.uploadedAt) {
          return new Date(curr.uploadedAt) > new Date(max.uploadedAt) ? curr : max;
        }
        if (curr.version && max.version) {
          return curr.version > max.version ? curr : max;
        }
        return curr;
      }, group[0]);
    });
    // Filtrar por umbral de similitud muy bajo para depuración
    const SIMILARITY_THRESHOLD = 0.0;
    const filteredResults = latestChunks.filter(r => typeof r.$similarity === 'number' && r.$similarity >= SIMILARITY_THRESHOLD);
    debugLog('[searchFromAstra] Chunks tras filtro y agrupamiento:', filteredResults.map(r => ({ text: r.text, similarity: r.$similarity, category: r.category, promptKey: r.promptKey, detectedLang: r.detectedLang, version: r.version, _id: r._id })));
    return filteredResults.map(r => r.text);
  }

  // Branch normal: buscar por filtro, devolver array de textos
  const normalCursor = await collection.find(baseFilter, {
    sort: { uploadedAt: -1 },
    limit: 50,
  });
  const normalResults = await normalCursor.toArray();
  debugLog('[searchFromAstra] Chunks recuperados (branch normal):', normalResults.map(r => ({ text: r.text, category: r.category, promptKey: r.promptKey, detectedLang: r.detectedLang, version: r.version, _id: r._id })));
  // Agrupar por category+promptKey+detectedLang y tomar el chunk con la versión más alta
  const grouped: Record<string, any[]> = {};
  for (const chunk of normalResults) {
    const key = `${chunk.category ?? ''}|${chunk.promptKey ?? ''}|${chunk.detectedLang ?? ''}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(chunk);
  }
  let latestChunks = Object.values(grouped).map(group => {
    return group.reduce((max, curr) => {
      if (curr.uploadedAt && max.uploadedAt) {
        return new Date(curr.uploadedAt) > new Date(max.uploadedAt) ? curr : max;
      }
      if (curr.version && max.version) {
        return curr.version > max.version ? curr : max;
      }
      return curr;
    }, group[0]);
  });
  debugLog('[searchFromAstra] Chunks tras agrupamiento (branch normal):', latestChunks.map(r => ({ text: r.text, category: r.category, promptKey: r.promptKey, detectedLang: r.detectedLang, version: r.version, _id: r._id })));
  // Si no hay filtro de idioma, devolver todos los textos disponibles
  if (!targetLang) {
    latestChunks = normalResults;
  }
  return latestChunks.map(r => r.text);
}


