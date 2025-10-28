import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.STRUCTURED_ENABLED = 'false';
process.env.EMAIL_SENDING_ENABLED = 'true';

vi.mock('@/lib/astra_connection', async () => await import('../mocks/astra'));
vi.mock('@/lib/redis', async () => await import('../mocks/redis'));
vi.mock('@/lib/db/messages', async () => await import('../mocks/db_messages'));
vi.mock('@/lib/db/conversations', async () => await import('../mocks/db_conversations'));

vi.mock('@/lib/agents', () => ({
    agentGraph: { invoke: vi.fn(async () => ({ messages: [{ role: 'assistant', content: '' }], category: 'retrieval_based' })) },
}));

// Mock email send
vi.mock('@/lib/email/sendReservationCopy', () => ({
    sendReservationCopy: vi.fn(async () => { /* noop */ }),
}));

// Mock WhatsApp availability + send OK
vi.mock('@/lib/whatsapp/sendReservationCopyWA', () => ({
    sendReservationCopyWA: vi.fn(async () => { /* noop */ }),
}));
vi.mock('@/lib/adapters/whatsappBaileysAdapter', () => ({
    isWhatsAppReady: () => true,
}));
vi.mock('@/lib/whatsapp/dispatch', () => ({
    publishSendReservationCopy: vi.fn(async () => ({ published: true, requestId: null })),
}));

// Mock hotel config
vi.mock('@/lib/config/hotelConfig.server', () => ({
    getHotelConfig: vi.fn(async () => ({
        hotelName: 'Hotel Demo',
        channelConfigs: {
            email: { smtpHost: 'smtp.example.com', smtpPort: 587, dirEmail: 'noreply@example.com', password: 'x', enabled: true, mode: 'automatic' },
            whatsapp: { enabled: true, mode: 'automatic', celNumber: '+1234567' },
        },
    })),
}));

import { handleIncomingMessage } from '@/lib/handlers/messageHandler';
import { getCollection } from '../mocks/astra';

const hotelId = 'hotel999';
const channel = 'web' as const;
const conversationId = 'conv-email-wa';
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

describe('send_email_copy → send_whatsapp_copy transition', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('prompts for WhatsApp number if asked to resend via WhatsApp without number', async () => {
        await handleIncomingMessage({ ...baseUser('Enviame una copia al correo test1@demo.com') } as any, { mode: 'automatic', sendReply });
        await handleIncomingMessage({ ...baseUser('mandala por whatsapp') } as any, { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId });
        const texts = extractAssistantMsgs(msgs);
        const last = texts.at(-1) || '';
        expect(last.toLowerCase()).toMatch(/whatsapp/);
        expect(last).toMatch(/número|numero|number/i);
    });

    it('sends via WhatsApp when number provided inline after email copy', async () => {
        await handleIncomingMessage({ ...baseUser('Enviame una copia al correo test2@demo.com') } as any, { mode: 'automatic', sendReply });
        await handleIncomingMessage({ ...baseUser('reenviá al whatsapp +59891359375') } as any, { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId });
        const texts = extractAssistantMsgs(msgs);
        const last = texts.at(-1) || '';
        expect(last).toMatch(/WhatsApp/i);
        expect(last).toMatch(/59891359375/);
    });

    it('pide número válido si el formato de teléfono es inválido o insuficiente', async () => {
        await handleIncomingMessage({ ...baseUser('Enviame una copia al correo test4@demo.com') } as any, { mode: 'automatic', sendReply });
        await handleIncomingMessage({ ...baseUser('mandalo al whatsapp abc123') } as any, { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId });
        const texts = extractAssistantMsgs(msgs);
        const last = texts.at(-1) || '';
        expect(last.toLowerCase()).toMatch(/whatsapp/);
        // Debe contener indicación de que falta o es inválido
        expect(last).toMatch(/válido|valido|formato|número|numero/i);
    });

    it('normaliza número con espacios y guiones', async () => {
        await handleIncomingMessage({ ...baseUser('Enviame una copia al correo test6@demo.com') } as any, { mode: 'automatic', sendReply });
        await handleIncomingMessage({ ...baseUser('mandala por whatsapp +54 11-5555-0000 gracias') } as any, { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId });
        const texts = extractAssistantMsgs(msgs);
        const last = texts.at(-1) || '';
        expect(last).toMatch(/WhatsApp/i);
        expect(last).toMatch(/541155550000/);
    });
});

// Error path test: WA_NOT_READY fallback
describe('send_email_copy → whatsapp error path', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('handles WA_NOT_READY returning initialization message', async () => {
        // Override mock to simulate not ready
        vi.doMock('@/lib/adapters/whatsappBaileysAdapter', () => ({ isWhatsAppReady: () => false }));
        // publish returns published but we emulate readiness failure causing WA_NOT_READY logic during flow
        vi.doMock('@/lib/whatsapp/dispatch', () => ({ publishSendReservationCopy: vi.fn(async () => ({ published: false, requestId: null })) }));

        await handleIncomingMessage({ ...baseUser('Enviame una copia al correo test3@demo.com') } as any, { mode: 'automatic', sendReply });
        await handleIncomingMessage({ ...baseUser('mandala al whatsapp +59890001122') } as any, { mode: 'automatic', sendReply });
        const msgs = await getCollection('messages').findMany({ hotelId, conversationId });
        const texts = extractAssistantMsgs(msgs);
        const last = texts.at(-1) || '';
        // Mensaje debería contener indicación de que no se pudo o inicializando
        expect(last.toLowerCase()).toMatch(/whatsapp/);
        expect(last.toLowerCase()).toMatch(/no pude|inicializando|initializing/);
    });
});
