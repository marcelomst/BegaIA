import { describe, it, expect, vi, beforeEach } from 'vitest';

// We'll mock persistence and event bus to observe rich propagation
vi.mock('@/lib/db/messages', () => ({
    saveChannelMessageToAstra: vi.fn(async () => { }),
    getMessagesByConversation: vi.fn(async () => []),
}));
vi.mock('@/lib/db/conversations', () => ({
    getOrCreateConversation: vi.fn(async () => { }),
}));
vi.mock('@/lib/db/guests', () => ({
    getGuest: vi.fn(async () => null),
    createGuest: vi.fn(async () => { }),
    updateGuest: vi.fn(async () => { }),
}));
vi.mock('@/lib/db/convState', () => ({
    getConvState: vi.fn(async () => null),
    upsertConvState: vi.fn(async () => { }),
    CONVSTATE_VERSION: 'test',
}));
vi.mock('@/lib/handlers/pipeline/availability', () => ({
    runAvailabilityCheck: vi.fn(async () => ({ finalText: 'Disponibilidad OK', nextSlots: {}, needsHandoff: false })),
    isoToDDMMYYYY: (s: string) => s,
    getProposedAvailabilityRange: () => ({}),
    detectDateSideFromText: () => null,
    getLastUserDatesFromHistory: () => ({}),
    buildAskMissingDate: () => '¿Fecha faltante?',
    buildAskNewDates: () => '¿Nuevas fechas?',
    buildAskGuests: () => '¿Cantidad de huéspedes?',
    buildAskGuestName: () => '¿Nombre del huésped?',
    chooseRoomTypeForGuests: (rt: string | undefined) => ({ target: rt || 'standard', changed: false }),
    isAskAvailabilityStatusQuery: () => false,
    askedToVerifyAvailability: () => false,
    isPureConfirm: () => false,
    detectCheckinOrCheckoutTimeQuestion: () => null,
    isPureAffirmative: () => false,
    askedToConfirmCheckTime: () => null,
}));
vi.mock('@/lib/agents', () => ({
    agentGraph: {
        invoke: vi.fn(async () => ({
            messages: [{ role: 'assistant', content: 'Info habitaciones renderizada' }],
            category: 'retrieval_based',
            meta: { rich: { type: 'room-info-img', data: [{ type: 'Doble', icon: '🛏️', highlights: ['Vista mar'], images: ['https://img/test.jpg'] }] } },
        }))
    }
}));
vi.mock('@/lib/prompts', () => ({
    defaultPrompt: '{{retrieved}}',
    curatedPrompts: {},
}));
vi.mock('@langchain/openai', () => ({
    ChatOpenAI: class { constructor(_c: any) { } async invoke(msgs: any) { return { content: 'Respuesta base' }; } },
}));
vi.mock('@/lib/utils/debugLog', () => ({ debugLog: (..._a: any[]) => { } }));
vi.mock('@/lib/web/eventBus', () => ({ emitToConversation: vi.fn(() => { }) }));

import { handleIncomingMessage } from '@/lib/handlers/messageHandler';
import { emitToConversation } from '@/lib/web/eventBus';
import { saveChannelMessageToAstra } from '@/lib/db/messages';
import { agentGraph } from '@/lib/agents';

describe('messageHandler rich payload propagation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('persists and emits rich payload when graphResult.meta.rich presente', async () => {
        await handleIncomingMessage({
            messageId: 'm1',
            hotelId: 'h1',
            channel: 'web',
            sender: 'guest',
            content: 'habitación doble con imágenes',
            timestamp: new Date().toISOString(),
            conversationId: 'conv1',
            guestId: 'g1',
            detectedLanguage: 'es',
        } as any, { mode: 'automatic' });

        // Persistencia: el mensaje AI guardado debe incluir rich
        const saves = (saveChannelMessageToAstra as any).mock.calls.filter((c: any[]) => (c[0] && c[0].sender === 'assistant'));
        expect(saves.length).toBe(1);
        expect(saves[0][0].rich).toBeDefined();
        expect(saves[0][0].rich.type).toBe('room-info-img');

        // Emisión SSE
        const emits = (emitToConversation as any).mock.calls;
        const richEvent = emits.find((c: any[]) => c[1]?.rich?.type === 'room-info-img');
        expect(richEvent).toBeTruthy();
    });

    it('no persiste ni emite rich cuando graphResult.meta.rich ausente', async () => {
        // Forzar que esta invocación devuelva sin rich
        (agentGraph.invoke as any).mockImplementationOnce(async () => ({
            messages: [{ role: 'assistant', content: 'Solo texto' }],
            category: 'retrieval_based',
            meta: {},
        }));

        await handleIncomingMessage({
            messageId: 'm2',
            hotelId: 'h1',
            channel: 'web',
            sender: 'guest',
            content: 'solo texto',
            timestamp: new Date().toISOString(),
            conversationId: 'conv2',
            guestId: 'g1',
            detectedLanguage: 'es',
        } as any, { mode: 'automatic' });

        const saves = (saveChannelMessageToAstra as any).mock.calls.filter((c: any[]) => (c[0] && c[0].sender === 'assistant' && c[0].conversationId === 'conv2'));
        expect(saves.length).toBe(1);
        expect(saves[0][0].rich).toBeUndefined();

        const emits = (emitToConversation as any).mock.calls;
        const richEvent = emits.find((c: any[]) => c[0] === 'conv2' && c[1]?.rich);
        expect(richEvent).toBeFalsy();
    });

    it('persiste rich aún cuando data está vacía (estructura presente)', async () => {
        (agentGraph.invoke as any).mockImplementationOnce(async () => ({
            messages: [{ role: 'assistant', content: 'Estructura sin items' }],
            category: 'retrieval_based',
            meta: { rich: { type: 'room-info-img', data: [] } },
        }));

        await handleIncomingMessage({
            messageId: 'm3',
            hotelId: 'h1',
            channel: 'web',
            sender: 'guest',
            content: 'estructura vacía',
            timestamp: new Date().toISOString(),
            conversationId: 'conv3',
            guestId: 'g1',
            detectedLanguage: 'es',
        } as any, { mode: 'automatic' });

        const saves = (saveChannelMessageToAstra as any).mock.calls.filter((c: any[]) => (c[0] && c[0].sender === 'assistant' && c[0].conversationId === 'conv3'));
        expect(saves.length).toBe(1);
        expect(saves[0][0].rich).toBeDefined();
        expect(saves[0][0].rich.type).toBe('room-info-img');
        expect(Array.isArray(saves[0][0].rich.data)).toBe(true);
        expect(saves[0][0].rich.data.length).toBe(0);

        const emits = (emitToConversation as any).mock.calls;
        const richEvent = emits.find((c: any[]) => c[0] === 'conv3' && c[1]?.rich?.type === 'room-info-img');
        expect(richEvent).toBeTruthy();
    });
});
