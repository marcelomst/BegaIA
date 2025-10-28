import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock embeddings and ChatOpenAI to avoid network and satisfy translation module imports
vi.mock('@langchain/openai', () => ({
    OpenAIEmbeddings: class {
        async embedQuery(_q: string) { return Array(5).fill(0.1); }
    },
    ChatOpenAI: class {
        constructor(_opts?: any) { }
        async invoke(_msgs: any) { return { content: '' }; }
    }
}));

// In-memory fake collection that supports find(...).toArray() with includeSimilarity shape
class FakeCollection {
    docs: any[] = [];
    constructor(docs: any[]) { this.docs = docs; }
    async insertOne(doc: any) { this.docs.push(doc); return { acknowledged: true }; }
    find(filter: Record<string, any> = {}, opts: any = {}) {
        const filtered = this.docs.filter(d => {
            for (const [k, v] of Object.entries(filter)) {
                if (d[k] !== v) return false;
            }
            return true;
        });
        const includeSim = !!opts?.includeSimilarity;
        const byCategory = typeof filter.category === 'string';
        return {
            async toArray() {
                if (includeSim && byCategory) {
                    // Match branch in searchFromAstra(category) expecting nested doc shape
                    return filtered.map(d => ({ document: { document: d }, similarity: 0.99 }));
                }
                // For other cases (including final fallback), return top-level docs
                return filtered;
            }
        } as any;
    }
}

// Mock getHotelAstraCollection to return our fake collection
// Provide $vector arrays (length 5 to match our embedder stub)
const fakeDocsBase = [
    { _id: '1', hotelId: 'h1', version: 'v1', uploadedAt: '2025-01-01T00:00:00.000Z', category: 'retrieval_based', text: 'DOC ES', targetLang: 'es', $vector: [0.1, 0.1, 0.1, 0.1, 0.1] },
    { _id: '2', hotelId: 'h1', version: 'v1', uploadedAt: '2025-01-01T00:00:01.000Z', category: 'retrieval_based', text: 'DOC PT', targetLang: 'pt', $vector: [0.1, 0.1, 0.1, 0.1, 0.1] },
    { _id: '3', hotelId: 'h1', version: 'v1', uploadedAt: '2025-01-01T00:00:02.000Z', category: 'retrieval_based', text: 'DOC EN', targetLang: 'en', $vector: [0.1, 0.1, 0.1, 0.1, 0.1] },
];
let fakeCol!: FakeCollection;

vi.mock('@/lib/astra/connection', () => ({
    getHotelAstraCollection: (_hotelId: string) => fakeCol,
}));

import { searchFromAstra } from '@/lib/retrieval';

describe('searchFromAstra language filter', () => {
    beforeEach(() => {
        fakeCol = new FakeCollection([...fakeDocsBase]);
    });

    it('filters by userLang (pt) when supported', async () => {
        const results = await searchFromAstra('qualquer', 'h1', { category: 'retrieval_based' }, 'pt');
        expect(results).toEqual(['DOC PT']);
    });

    it('filters by userLang (es)', async () => {
        const results = await searchFromAstra('consulta', 'h1', { category: 'retrieval_based' }, 'es');
        expect(results).toEqual(['DOC ES']);
    });

    it('filters by userLang (en)', async () => {
        const results = await searchFromAstra('any', 'h1', { category: 'retrieval_based' }, 'en');
        expect(results).toEqual(['DOC EN']);
    });

    it('falls back to no filter when userLang not supported and no filters.targetLang', async () => {
        // userLang=it (unsupported) => no targetLang added; baseFilter only hotelId+version+category
        const results = await searchFromAstra('ciao', 'h1', { category: 'retrieval_based' }, 'it');
        // In our implementation, normalizeLang('it') => 'other' => no targetLang filter
        // Then category branch returns most similar; our fake returns all with similarity, then code applies semantic threshold 0.95
        // We set similarity 0.99, so all pass -> returns texts in insertion order
        expect(results).toEqual(['DOC ES', 'DOC PT', 'DOC EN']);
    });
});
