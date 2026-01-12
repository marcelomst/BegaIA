// Path: /root/begasist/lib/retrieval/curation.ts
import type { Document } from "@langchain/core/documents";

export type Classification = { category?: string; promptKey?: string };

/**
 * Curation mínima: por ahora no clasifica (deja que el resolver use enforced/fallback).
 * Retorna un array alineado a los documentos con objetos vacíos.
 */
export async function classifyFragmentsWithCurationAssistant(docs: Document[]): Promise<Classification[]> {
    return docs.map(() => ({}));
}
