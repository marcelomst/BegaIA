import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.STRUCTURED_ENABLED = 'false';

// Infra mocks reutilizando los existentes
vi.mock('@/lib/astra_connection', async () => await import('../mocks/astra'));
vi.mock('@/lib/redis', async () => await import('../mocks/redis'));
vi.mock('@/lib/db/messages', async () => await import('../mocks/db_messages'));
vi.mock('@/lib/db_messages', async () => await import('../mocks/db_messages'));
vi.mock('@/lib/db/conversations', async () => await import('../mocks/db_conversations'));
vi.mock('@/lib/db_conversations', async () => await import('../mocks/db_conversations'));

// Mock minimal del grafo para no interferir en la heurística (el post-proc/slots es lo que nos importa)
vi.mock('@/lib/agents', () => ({
    agentGraph: {
        invoke: vi.fn(async () => ({ messages: [{ role: 'assistant', content: 'Entendido.' }], category: 'reservation' })),
    },
}));

import { handleIncomingMessage } from '@/lib/handlers/messageHandler';
import { getConvState } from '@/lib/db/convState';
import { getCollection } from '../mocks/astra';

vi.mock('@/lib/db/convState', () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    CONVSTATE_VERSION: 'convstate-test',
}));

const hotelId = 'hotel999';
const channel = 'web' as const;
const conversationId = 'conv-year-inheritance-heuristic-1';
const sendReply = vi.fn(async () => { });

function msg(content: string) {
    return {
        hotelId,
        channel,
        conversationId,
        messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
        sender: 'guest' as const,
        role: 'user' as const,
        content,
        detectedLanguage: 'es',
        timestamp: new Date().toISOString(),
    };
}

describe('messageHandler: heurística year inheritance (nuevo check in + dd/mm)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId,
            reservationSlots: {
                guestName: 'Tester',
                roomType: 'double',
                checkIn: '2025-11-30',
                checkOut: '2025-12-02',
                numGuests: '2',
            },
            salesStage: 'close',
            updatedAt: new Date().toISOString(),
        });
    });

    it('consolida rango 03/12/2025 → 05/12/2025 sin pedir check-out porque lo infiere con dd/mm', async () => {
        // Paso 1: usuario introduce nuevo check in completo
        await handleIncomingMessage(msg('nuevo check in 03/12/2025'), { mode: 'automatic', sendReply });
        // Paso 2: usuario da solo la fecha dd/mm
        await handleIncomingMessage(msg('05/12'), { mode: 'automatic', sendReply });

        const all = await getCollection('messages').findMany({ hotelId, conversationId });
        const lastAi = all.filter((m: any) => m.sender === 'assistant').at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || '');

        expect(txt).toMatch(/03\/12\/2025/);
        expect(txt).toMatch(/05\/12\/2025/);
        // No debe aparecer una repregunta de check-out en el mismo turno
        expect(txt.toLowerCase()).not.toMatch(/fecha de check-out|confirmarme.*check-out/);
    });
});
