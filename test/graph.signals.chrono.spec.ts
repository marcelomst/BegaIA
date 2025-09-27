import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll spy on fillSlotsWithLLM to capture the augmented prompt (first arg)
import * as reservations from '@/lib/agents/reservations';
import { agentGraph } from '@/lib/agents/graph';

const OLD_ENV = { ...process.env };

describe('graph: signals include Chrono dates when flag is on', () => {
    beforeEach(() => {
        process.env = { ...OLD_ENV, USE_CHRONO_LAYER: '1' };
        vi.resetModules();
    });

    it('injects Chrono-derived dates into the augmented user text', async () => {
        // Mock Chrono loader and extraction via global hook used in helpers
        // @ts-ignore
        globalThis.__chronoImport = async () => ({
            parse: (_text: string) => [{
                start: { date: () => new Date('2025-12-05T00:00:00Z') },
                end: { date: () => new Date('2025-12-07T00:00:00Z') },
            }],
            es: {
                parse: (_text: string) => [{
                    start: { date: () => new Date('2025-12-05T00:00:00Z') },
                    end: { date: () => new Date('2025-12-07T00:00:00Z') },
                }]
            },
        });

        const spy = vi.spyOn(reservations, 'fillSlotsWithLLM').mockResolvedValue({ need: 'question', question: '¿Cuál es el nombre completo?' });

        const input = {
            messages: [],
            normalizedMessage: 'próximo viernes al domingo',
            category: 'reservation',
            detectedLanguage: 'es',
            sentiment: 'neutral',
            preferredLanguage: 'es',
            promptKey: 'reservation_flow',
            hotelId: 'hotel999',
            conversationId: 'conv-chrono-1',
            meta: { channel: 'web', prevCategory: null },
            reservationSlots: {},
            intentConfidence: 0.9,
            intentSource: 'heuristic',
            desiredAction: 'create',
            salesStage: 'qualify',
            lastOffer: null,
            upsellCount: 0,
        } as any;

        // Run the graph (single turn); it stops after handle_reservation
        const out = await agentGraph.invoke(input);
        expect(out.category).toBe('reservation');

        // Assert the first arg passed to fillSlotsWithLLM contains the signals
        expect(spy).toHaveBeenCalled();
        const [augmentedUserText] = spy.mock.calls[0];
        expect(augmentedUserText).toContain('Señales detectadas');
        expect(augmentedUserText).toContain('"checkIn":"2025-12-05"');
        expect(augmentedUserText).toContain('"checkOut":"2025-12-07"');

        spy.mockRestore();
    });
});
