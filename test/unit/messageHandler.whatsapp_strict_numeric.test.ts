import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.STRUCTURED_ENABLED = 'false';
process.env.EMAIL_SENDING_ENABLED = 'true';
process.env.WHATSAPP_STRICT_NUMERIC = '1';

vi.mock('@/lib/astra_connection', async () => await import('../mocks/astra'));
vi.mock('@/lib/redis', async () => await import('../mocks/redis'));
vi.mock('@/lib/db/messages', async () => await import('../mocks/db_messages'));
vi.mock('@/lib/db/conversations', async () => await import('../mocks/db_conversations'));

vi.mock('@/lib/agents', () => ({
    agentGraph: { invoke: vi.fn(async () => ({ messages: [{ role: 'assistant', content: '' }], category: 'retrieval_based' })) },
}));

vi.mock('@/lib/email/sendReservationCopy', () => ({
    sendReservationCopy: vi.fn(async () => { /* noop */ }),
}));

vi.mock('@/lib/whatsapp/sendReservationCopyWA', () => ({
    sendReservationCopyWA: vi.fn(async () => { /* noop */ }),
}));
vi.mock('@/lib/adapters/whatsappBaileysAdapter', () => ({
    isWhatsAppReady: () => true,
}));
vi.mock('@/lib/whatsapp/dispatch', () => ({
    publishSendReservationCopy: vi.fn(async () => ({ published: true, requestId: null })),
}));

vi.mock('@/lib/config/hotelConfig.server', () => ({
    getHotelConfig: vi.fn(async () => ({
        hotelName: 'Hotel Demo',
        channelConfigs: {
            email: { smtpHost: 'smtp.example.com', smtpPort: 587, dirEmail: 'noreply@example.com', password: 'x', enabled: true, mode: 'automatic' },
            whatsapp: { enabled: true, mode: 'automatic', celNumber: '+1234567' },
        },
    })),
}));

import { handleIncomingMessage, getWaPhoneMetrics, resetWaPhoneMetrics } from '@/lib/handlers/messageHandler';
import { getCollection } from '../mocks/astra';

const hotelId = 'hotel999';
const channel = 'web' as const;
const conversationId = 'conv-strict-wa';
const sendReply = vi.fn(async () => { });

const baseUser = (content: string) => ({
    hotelId,
    channel,
    conversationId,
    messageId: `m-${Math.random().toString(36).slice(2, 9)}`,
    sender: 'guest' as const,
    role: 'user' as const,
    content,
    timestamp: new Date().toISOString(),
});

function extractAssistantMsgs(msgs: any[]) {
    return msgs.filter(m => m.sender === 'assistant').map(m => m.content || m.suggestion || '');
}

describe('STRICT_WA_NUMERIC enforcement', () => {
    beforeEach(() => { vi.clearAllMocks(); resetWaPhoneMetrics(); });

    it('rechaza número alfanumérico cuando STRICT_WA_NUMERIC=1 y pide uno válido', async () => {
        await handleIncomingMessage({ ...baseUser('Enviame una copia al correo testStrict@demo.com') } as any, { mode: 'automatic', sendReply });
        await handleIncomingMessage({ ...baseUser('mandala por whatsapp +54 11-55A5-0000') } as any, { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId });
        const texts = extractAssistantMsgs(msgs);
        const last = texts.at(-1) || '';
        expect(last.toLowerCase()).toMatch(/whatsapp/);
        // Debe pedir nuevamente (no debe haber enviado)
        expect(last).toMatch(/número|numero|válido|valido|código|codigo/i);
        const metrics = getWaPhoneMetrics();
        expect(metrics.invalidAttempts).toBeGreaterThanOrEqual(1);
        expect(metrics.accepted).toBe(0);
    });
});
