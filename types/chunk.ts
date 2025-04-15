export interface ChunkResult {
    _id: string;
    text: string;
    hotelId: string;
    category: string;
    promptKey?: string | null;
    $vector: number[];
    $similarity: number;
  }
export type InsertableChunk = Omit<ChunkResult, "$similarity" | "_id">;

  