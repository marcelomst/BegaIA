// Path: /root/begasist/test/unit/searchFromAstra.filters.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
let capturedFilter: any = null;
let capturedOptions: any = null;

vi.mock('@/lib/astra/connection', () => {
    return {
        getHotelAstraCollection: vi.fn(async () => ({
            find: (filter: any, options: any = {}) => {
                capturedFilter = { ...(filter || {}) };
                capturedOptions = { ...(options || {}) };
                return {
                    toArray: async () => [{ text: 'chunk-1' }, { text: 'chunk-2' }],
                } as any;
            },
        })),
    };
});

vi.mock('@/lib/categories/resolveCategory', () => {
    return {
        resolveCategoryForHotel: vi.fn(async (opts: any) => ({
            categoryId: `${opts.category}/${opts.promptKey}`,
            hotelId: opts.hotelId,
            enabled: true,
            router: { category: opts.category, promptKey: opts.promptKey },
            retriever: {
                topK: 7,
                filters: {
                    category: opts.category,
                    promptKey: opts.promptKey,
                    status: 'active',
                    extra_ignored: 'x',
                },
            },
            lang: 'en',
        })),
    };
});

import { searchFromAstra } from '@/lib/retrieval/index';

describe('searchFromAstra: merges registry/overrides filters and topK', () => {
    beforeEach(() => {
        capturedFilter = null;
        capturedOptions = null;
    });

    it('applies merged filters (whitelisted) and topK as limit, and resolved lang', async () => {
        const out = await searchFromAstra(
            'wifi',
            'hotelX',
            { category: 'amenities', promptKey: 'ev_charging' },
            'es'
        );

        expect(Array.isArray(out)).toBe(true);
        expect(capturedFilter).toBeTruthy();
        // base + merged
        expect(capturedFilter.hotelId).toBe('hotelX');
        expect(capturedFilter.category).toBe('amenities');
        expect(capturedFilter.promptKey).toBe('ev_charging');
        // userLang 'es' + no filters.targetLang → base mantiene 'es' al estar soportado; resolved.lang ('en') no fuerza cambio
        expect(capturedFilter.targetLang).toBe('es');
        // extra_ignored debe ser filtrado (no permitido)
        expect((capturedFilter as any).extra_ignored).toBeUndefined();

        // topK aplicado como limit
        expect(capturedOptions?.limit).toBe(7);
        // includeSimilarity al tener category/promptKey
        expect(capturedOptions?.includeSimilarity).toBe(true);
    });
});
