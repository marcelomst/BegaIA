// /root/begasist/types/chunk.ts

export interface ChunkResult {
  _id: string;
  hotelId: string;
  category: string;
  promptKey?: string | null;
  text: string;
  $vector: number[];
  $similarity: number;
  originalName?: string;
  uploader?: string;
  chunkIndex?: number;
  mimeType?: string;
  uploadedAt?: string;
  version?: string;
  // ...otros metadatos que quieras persistir
}

// Permite omitir campos que no son obligatorios al insertar (como _id y $similarity)
export type InsertableChunk = Omit<ChunkResult, "_id" | "$similarity">;


// Filtros usados en searchFromAstra
export type SearchFilters = {
  category?: string;
  promptKey?: string;
  version?: string;   // <--- nuevo campo
};