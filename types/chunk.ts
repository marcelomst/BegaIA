// /root/begasist/types/chunk.ts

/**
 * DEPRECADO para prompts/playbooks: Usar HotelContent/HotelVersionIndex (ver types/hotelContent.ts)
 * ChunkResult se mantiene para chunks y embeddings de la base de conocimiento general.
 */
export type ChunkResult = {
  _id?: string;
  hotelId: string;
  category?: string | null;
  promptKey?: string | null;
  version?: string;
  uploader?: string;
  author?: string | null; // 👈 AGREGAR
  originalName?: string;
  uploadedAt?: string;
  text: string;
  $vector: number[];      // puede ser number[] o cualquier tipo si lo pedís así
  detectedLang?: string | null; // 👈 AGREGAR
  targetLang?: string | null;   // 👈 AGREGAR
  detectedLangScore?: number | null; // confianza detección 0-1
  // ... cualquier otro campo custom
  metadata?: Record<string, any>; // opcional: metadatos adicionales por chunk
  doc_json?: any;                // espejo opcional para auditoría/compat
};


// Permite omitir campos que no son obligatorios al insertar (como _id y $similarity)
export type InsertableChunk = Omit<ChunkResult, "_id" | "$similarity">;


// Filtros usados en searchFromAstra
export type SearchFilters = {
  category?: string;
  promptKey?: string;
  version?: string;   // <--- nuevo campo
  targetLang?: string; // filtro por idioma indexado (es|en|pt)
};