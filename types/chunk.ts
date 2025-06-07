// /root/begasist/types/chunk.ts

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
  // ... cualquier otro campo custom
};


// Permite omitir campos que no son obligatorios al insertar (como _id y $similarity)
export type InsertableChunk = Omit<ChunkResult, "_id" | "$similarity">;


// Filtros usados en searchFromAstra
export type SearchFilters = {
  category?: string;
  promptKey?: string;
  version?: string;   // <--- nuevo campo
};