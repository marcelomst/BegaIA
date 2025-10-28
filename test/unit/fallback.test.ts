import { describe, it, expect } from 'vitest';
import { ruleBasedFallback } from '@/lib/handlers/pipeline/fallback';

describe('ruleBasedFallback', () => {
    it('returns spanish fallback', () => {
        expect(ruleBasedFallback({ lang: 'es' }).toLowerCase()).toContain('¿podés reformular');
    });
    it('returns portuguese fallback', () => {
        expect(ruleBasedFallback({ lang: 'pt' }).toLowerCase()).toContain('pode reformular');
    });
    it('returns english fallback', () => {
        expect(ruleBasedFallback({ lang: 'en' }).toLowerCase()).toContain('could you rephrase');
    });
    it('supports legacy signature', () => {
        // legacy signature: ruleBasedFallback(lang, query)
        // @ts-ignore
        expect(ruleBasedFallback('es', 'hola').toLowerCase()).toContain('¿podés reformular');
    });
});
