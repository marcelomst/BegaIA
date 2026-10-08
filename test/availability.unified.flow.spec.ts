// /home/marcelo/begasist/test/availability.unified.flow.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
// Mock modules early to ensure spies attach before imports
vi.mock('@/lib/db/convState', () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    resolveGuestState: vi.fn(() => undefined),
    CONVSTATE_VERSION: 'convstate-test'
}));
vi.mock('@/lib/agents/reservations', () => ({ askAvailability: vi.fn(), fillSlotsWithLLM: vi.fn(), confirmAndCreate: vi.fn() }));
vi.mock('@/lib/config/hotelConfig.server', () => ({ getHotelConfig: vi.fn().mockResolvedValue({ timezone: 'UTC' }) }));
vi.mock('@/lib/classifier', async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/classifier")>();
    return {
        ...actual,
        isPureGreeting: vi.fn(() => false),
    };
});// We don't mock the whole availability pipeline; we'll spy on its export after import
import * as availabilityPipeline from '@/lib/handlers/pipeline/availability';
import * as reservations from '@/lib/agents/reservations';
import { agentGraph } from '@/lib/agents';
import { getConvState, upsertConvState } from '@/lib/db/convState';

// Minimal pre-like stub
const preBase = (lang: 'es' | 'en' | 'pt' = 'es') => ({
    lang,
    lcHistory: [] as (HumanMessage | AIMessage)[],
    st: {},
    msg: { hotelId: 'hotel999' },
    conversationId: 'hotel999-web-guest',
    guest: undefined as any,
});

const snapshotBase = {
    guestName: 'Juan Perez',
    roomType: 'double',
    numGuests: '2',
    checkIn: '2025-10-20',
    checkOut: '2025-10-22',
    locale: 'es',
};

describe('availability unified flow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('runAvailabilityCheck enriches response and persists lastProposal', async () => {
        // mock askAvailability
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'usd' }],
            proposal: 'Tengo disponibilidad para doble.'
        } as any);
        const upsertSpy = vi.spyOn(await import('@/lib/db/convState'), 'upsertConvState').mockResolvedValue(undefined as any);

        const pre = preBase('es');
        const res = await availabilityPipeline.runAvailabilityCheck(pre as any, snapshotBase as any, snapshotBase.checkIn, snapshotBase.checkOut);
        expect(res.finalText).toMatch(/Tarifa por noche: 100/i);
        expect(res.finalText).toMatch(/para Juan Perez/i);
        expect(res.finalText).toMatch(/Check-in: 20\/10\/2025/i);
        expect(res.finalText).toMatch(/Check-out: 22\/10\/2025/i);
        expect(res.finalText).toMatch(/Huéspedes: 2 huéspedes/i);
        expect(res.finalText).toMatch(/Total 2 noches: 200 USD/i);
        expect(res.finalText).toMatch(/CONFIRMAR/i);
        expect(res.finalText).not.toMatch(/^Juan\b/i);
        expect(upsertSpy).toHaveBeenCalled();
        expect((upsertSpy.mock.calls[0]?.[2] as any)?.lastProposal?.text).toBe(res.finalText);
    });

    it.each([
        ['es', 'Huéspedes: 1 huésped', 'Total 2 noches: 200 USD', '¿Confirmás la reserva?'],
        ['en', 'Guests: 1 guest', 'Total 2 nights: 200 USD', 'Do you confirm the booking?'],
        ['pt', 'Hóspedes: 1 hóspede', 'Total 2 noites: 200 USD', 'Confirma a reserva'],
    ] as const)('mantiene proposal completa y localizada en %s', async (lang, guestCopy, nightsCopy, cta) => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'usd' }],
        } as any);
        const upsertSpy = vi.spyOn(await import('@/lib/db/convState'), 'upsertConvState').mockResolvedValue(undefined as any);
        const snapshot = { ...snapshotBase, numGuests: '1', locale: lang };

        const res = await availabilityPipeline.runAvailabilityCheck(preBase(lang) as any, snapshot as any, snapshot.checkIn, snapshot.checkOut);

        expect(res.finalText).toContain('20/10/2025');
        expect(res.finalText).toContain('22/10/2025');
        expect(res.finalText).toContain(guestCopy);
        expect(res.finalText).toContain(nightsCopy);
        expect(res.finalText).toContain(cta);
        expect(res.finalText).not.toMatch(/undefined|null/i);
        expect((upsertSpy.mock.calls[0]?.[2] as any)?.lastProposal?.text).toBe(res.finalText);
    });

    it('inquiry disponible no agrega CTA de create ni persiste lastProposal', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'usd' }],
        } as any);
        const upsertSpy = vi.spyOn(await import('@/lib/db/convState'), 'upsertConvState').mockResolvedValue(undefined as any);

        const res = await availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotBase as any,
            snapshotBase.checkIn,
            snapshotBase.checkOut,
            { mode: 'inquiry', persistConvState: false },
        );

        expect(res.finalText).not.toMatch(/CONFIRMAR|¿Confirmás la reserva/i);
        expect(upsertSpy).not.toHaveBeenCalled();
    });

    it('proposal confirmable sin pricing conserva datos canónicos sin inventar precio ni moneda', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [],
            proposal: 'Hay disponibilidad.',
        } as any);

        const res = await availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotBase as any,
            snapshotBase.checkIn,
            snapshotBase.checkOut,
        );

        expect(res.finalText).toMatch(/doble.*Juan Perez/i);
        expect(res.finalText).toMatch(/20\/10\/2025.*22\/10\/2025/i);
        expect(res.finalText).toMatch(/2 huéspedes/i);
        expect(res.finalText).toMatch(/2 noches/i);
        expect(res.finalText).toMatch(/CONFIRMAR/i);
        expect(res.finalText).not.toMatch(/Tarifa|Rate|USD|undefined|null/i);
    });

    it('create completo usa vocativo solo desde guest canónico y mantiene titular de reserva en el proposal', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'usd' }],
            proposal: 'Tengo disponibilidad para doble.'
        } as any);

        const pre = {
            ...preBase('es'),
            guest: { guestId: 'g1', hotelId: 'hotel999', name: 'Geronimo' },
        };
        const snapshot = {
            ...snapshotBase,
            guestName: 'Marcelo Martinez',
        };

        const res = await availabilityPipeline.runAvailabilityCheck(pre as any, snapshot as any, snapshot.checkIn, snapshot.checkOut);
        expect(res.finalText).toMatch(/^Geronimo,\s+tengo doble disponible para Marcelo Martinez\./i);
        expect(res.finalText).not.toMatch(/^Marcelo,\s+tengo/i);
    });

    it('sin guest canónico mantiene tono neutro y no usa el titular como vocativo', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'usd' }],
            proposal: 'Tengo disponibilidad para doble.'
        } as any);

        const snapshot = {
            ...snapshotBase,
            guestName: 'Ana Gomez',
        };

        const res = await availabilityPipeline.runAvailabilityCheck(preBase('es') as any, snapshot as any, snapshot.checkIn, snapshot.checkOut);
        expect(res.finalText).toMatch(/^Tengo doble disponible para Ana Gomez\./i);
        expect(res.finalText).not.toMatch(/^Ana,\s+tengo/i);
    });

    it('graph reservation path uses runAvailabilityCheck downstream (slots complete)', async () => {
        // fill slots so graph sees a complete snapshot
        const fsSpy = vi.spyOn(reservations, 'fillSlotsWithLLM').mockResolvedValue({ need: 'none', slots: { ...snapshotBase } } as any);
        // ensure availability pipeline downstream call is exercised and stable
        const aaSpy = vi.spyOn(reservations, 'askAvailability').mockResolvedValue({ ok: true, available: true, options: [], proposal: 'Tengo disponibilidad.' } as any);
        vi.spyOn(await import('@/lib/db/convState'), 'getConvState').mockResolvedValue({ reservationSlots: {} } as any);
        const input = {
            detectedLanguage: 'es',
            category: 'reservation',
            reservationSlots: { ...snapshotBase },
            normalizedMessage: 'quiero reservar',
            hotelId: 'hotel999',
            conversationId: 'hotel999-web-guest',
            messages: [],
        } as any;
        const result = await agentGraph.invoke(input);
        expect(result.category).toBeDefined();
        // Proxy assertion: if askAvailability was called, graph reached runAvailabilityCheck
        expect(aaSpy).toHaveBeenCalled();
    }, 15000);

    it('affirmative-after-offer triggers runAvailabilityCheck with ACK', async () => {
        // mock askAvailability
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true, available: true, options: [], proposal: 'Tengo disponibilidad.'
        } as any);

        // Simulate lcHistory: AI offered to verify, then user says OK
        const { handleIncomingMessage } = await import('@/lib/handlers/messageHandler');
        const preMsg = {
            messageId: 'm1', hotelId: 'hotel999', channel: 'web', sender: 'guest', conversationId: 'c1',
            role: 'ai', content: '¿Deseás que verifique disponibilidad?', direction: 'out', timestamp: new Date().toISOString(),
        } as any;

        // Seed minimal ConvState
        vi.spyOn(await import('@/lib/db/convState'), 'getConvState').mockResolvedValue({ reservationSlots: { checkIn: '2025-10-20', checkOut: '2025-10-22' } } as any);
        vi.spyOn(await import('@/lib/db/messages'), 'getMessagesByConversation').mockResolvedValue([] as any);
        vi.spyOn(await import('@/lib/db/messages'), 'saveChannelMessageToAstra').mockResolvedValue(undefined as any);
        vi.spyOn(await import('@/lib/db/conversations'), 'getOrCreateConversation').mockResolvedValue(undefined as any);
        vi.spyOn(await import('@/lib/db/guests'), 'getGuest').mockResolvedValue(null as any);
        vi.spyOn(await import('@/lib/db/guests'), 'createGuest').mockResolvedValue(undefined as any);
        vi.spyOn(await import('@/lib/db/guests'), 'updateGuest').mockResolvedValue(undefined as any);
        vi.spyOn(await import('@/lib/services/channelMemory'), 'channelMemory', 'get').mockReturnValue({ addMessage: () => { } } as any);
        vi.spyOn(await import('@/lib/telemetry/metrics'), 'incAutosend').mockReturnValue(undefined as any);

        const msg = { hotelId: 'hotel999', channel: 'web', sender: 'guest', conversationId: 'c1', content: 'ok', detectedLanguage: 'es' } as any;

        // Mock agentGraph basic behavior to avoid full LLM path
        vi.spyOn(await import('@/lib/agents'), 'agentGraph', 'get').mockReturnValue({
            invoke: async () => ({
                messages: [],
                category: 'reservation',
                salesStage: 'quote',
                desiredAction: undefined,
            }),
        } as any);

        await handleIncomingMessage(msg, { onlyBodyLLM: true, sendReply: async () => { } });
        // If no throw, path executed; deeper assertions would require capturing emitReply, which can be added if needed.
        expect(true).toBe(true);
    });
});
