import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.STRUCTURED_ENABLED = 'false';

vi.mock('@/lib/astra_connection', async () => await import('../mocks/astra'));
vi.mock('@/lib/redis', async () => await import('../mocks/redis'));
vi.mock('@/lib/db/messages', async () => await import('../mocks/db_messages'));
vi.mock('@/lib/db_messages', async () => await import('../mocks/db_messages'));
vi.mock('@/lib/db/conversations', async () => await import('../mocks/db_conversations'));
vi.mock('@/lib/db_conversations', async () => await import('../mocks/db_conversations'));

vi.mock('@/lib/agents', () => ({
    agentGraph: {
        invoke: vi.fn(async () => ({ messages: [{ role: 'assistant', content: 'What change would you like to make?' }], category: 'reservation' })),
    },
}));

import { handleIncomingMessage } from '@/lib/handlers/messageHandler';
import { getCollection } from '../mocks/astra';
import { getConvState } from '@/lib/db/convState';

vi.mock('@/lib/db/convState', () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    CONVSTATE_VERSION: 'convstate-test',
}));

const hotelId = 'hotel999';
const channel = 'web' as const;
const sendReply = vi.fn(async () => { });

function baseUser(conversationId: string, content: string, lang: string) {
    return {
        hotelId,
        channel,
        conversationId,
        messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
        sender: 'guest' as const,
        role: 'user' as const,
        content,
        detectedLanguage: lang,
        timestamp: new Date().toISOString(),
    };
}

describe('messageHandler: locale prompts for modifying single or both dates', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getConvState as any).mockResolvedValue({
            hotelId,
            conversationId: 'conv-x',
            reservationSlots: {
                guestName: 'John Doe',
                roomType: 'double',
                checkIn: '2025-11-10',
                checkOut: '2025-11-15',
                numGuests: '2',
            },
            salesStage: 'close',
            updatedAt: new Date().toISOString(),
        });
    });

    it('EN: "i want to modify the check in" → asks only for new check-in', async () => {
        const cid = 'conv-mod-checkin-en';
        await handleIncomingMessage(baseUser(cid, 'i want to modify the check in', 'en'), { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId: cid });
        const lastAi = msgs.filter((m: any) => m.sender === 'assistant').at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || '').toLowerCase();
        expect(txt).toMatch(/check-?in/);
        expect(txt).not.toMatch(/check-?out/);
    });

    it('PT: "quero modificar o check in" → asks only for new check-in', async () => {
        const cid = 'conv-mod-checkin-pt';
        await handleIncomingMessage(baseUser(cid, 'quero modificar o check in', 'pt'), { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId: cid });
        const lastAi = msgs.filter((m: any) => m.sender === 'assistant').at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || '').toLowerCase();
        expect(txt).toMatch(/check-?in/);
        expect(txt).not.toMatch(/check-?out/);
    });

    it('ES: "quiero modificar el check out" → asks only for new check-out', async () => {
        const cid = 'conv-mod-checkout-es';
        await handleIncomingMessage(baseUser(cid, 'quiero modificar el check out', 'es'), { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId: cid });
        const lastAi = msgs.filter((m: any) => m.sender === 'assistant').at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || '').toLowerCase();
        expect(txt).toMatch(/check-?out/);
        expect(txt).not.toMatch(/check-?in/);
    });

    it('EN: "dates" → asks for both sides', async () => {
        const cid = 'conv-dates-en';
        await handleIncomingMessage(baseUser(cid, 'dates', 'en'), { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId: cid });
        const lastAi = msgs.filter((m: any) => m.sender === 'assistant').at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || '').toLowerCase();
        expect(txt).toMatch(/check-?in/);
        expect(txt).toMatch(/check-?out/);
    });

    it('PT: "datas" → asks for both sides', async () => {
        const cid = 'conv-dates-pt';
        await handleIncomingMessage(baseUser(cid, 'datas', 'pt'), { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId: cid });
        const lastAi = msgs.filter((m: any) => m.sender === 'assistant').at(-1);
        const txt = String(lastAi?.content || lastAi?.suggestion || '').toLowerCase();
        expect(txt).toMatch(/check-?in/);
        expect(txt).toMatch(/check-?out/);
    });
});
