import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chronoExtractDateRange } from '@/lib/agents/helpers';

// We'll stub dynamic import of chrono-node by monkey-patching global import

describe('chronoExtractDateRange (flagged)', () => {
    const realEnv = { ...process.env };
    beforeEach(() => {
        process.env = { ...realEnv };
    });

    it('returns empty when flag is off', async () => {
        process.env.USE_CHRONO_LAYER = '0';
        const res = await chronoExtractDateRange('próximo viernes a domingo', 'es');
        expect(res).toEqual({});
    });

    it('parses range when flag is on and chrono returns start/end', async () => {
        process.env.USE_CHRONO_LAYER = '1';
        // @ts-ignore
        globalThis.__chronoImport = async () => ({
            parse: (_text: string) => [{
                start: { date: () => new Date('2025-10-10T00:00:00Z') },
                end: { date: () => new Date('2025-10-12T00:00:00Z') },
            }],
        });
        const res = await chronoExtractDateRange('próximo viernes a domingo', 'es');
        expect(res).toEqual({ checkIn: '2025-10-10', checkOut: '2025-10-12' });
    });

    it('assumes one night when only one start date and mentions "una noche"', async () => {
        process.env.USE_CHRONO_LAYER = '1';
        // @ts-ignore
        globalThis.__chronoImport = async () => ({
            parse: (_text: string) => [{ start: { date: () => new Date('2025-11-15T00:00:00Z') } }],
        });
        const res = await chronoExtractDateRange('este sábado una noche', 'es');
        expect(res).toEqual({ checkIn: '2025-11-15', checkOut: '2025-11-16' });
    });
});
