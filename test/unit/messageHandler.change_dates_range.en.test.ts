import { handleIncomingMessage, MH_VERSION } from '@/lib/handlers/messageHandler';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Utilidad mínima para simular turnos
async function send(content: string, convoId: string) {
    await handleIncomingMessage({
        hotelId: 'hotel999',
        channel: 'web',
        conversationId: convoId,
        messageId: crypto.randomUUID(),
        sender: 'guest',
        role: 'user',
        content,
        detectedLanguage: 'en',
        timestamp: new Date().toISOString()
    } as any, { mode: 'automatic', sendReply: async () => { } });
}

describe('messageHandler: direct change dates range (en)', () => {
    test('"change dates 01/12/2025 to 05/12/2025" → immediate range confirmation', async () => {
        const convoId = 'conv-change-dates-range-en';
        await send('change dates 01/12/2025 to 05/12/2025', convoId);
        // Recuperar mensajes guardados (último debe ser AI con confirmación)
        const { getMessagesByConversation } = await import('@/lib/db/messages');
        const msgs = await getMessagesByConversation({ hotelId: 'hotel999', conversationId: convoId, limit: 10 });
        const last = msgs.filter(m => m.role === 'ai').at(-1);
        expect(last?.content).toMatch(/Noted the new dates: 01\/12\/2025 → 05\/12\/2025/i);
    });
});
