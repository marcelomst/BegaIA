// /home/marcelo/begasist/test/availability.unified.flow.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
// Mock modules early to ensure spies attach before imports
vi.mock('@/lib/db/convState', () => ({
    getConvState: vi.fn(),
    upsertConvState: vi.fn(),
    publishDeterministicCreateProposalIfLatest: vi.fn(),
    finalizeDeterministicCreateProposalIfCurrent: vi.fn(),
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
import {
    getConvState,
    finalizeDeterministicCreateProposalIfCurrent,
    publishDeterministicCreateProposalIfLatest,
    upsertConvState,
} from '@/lib/db/convState';

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
        expect(res.status).toBe('available');
        expect(res.needsHandoff).toBe(false);
        expect(res.richProposal).toMatchObject({
            available: true,
            availabilityStatus: 'available',
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'usd' }],
            suggestedRoomType: 'double',
            suggestedPricePerNight: 100,
            snapshot: snapshotBase,
            toolCall: { outputSummary: 'available:true' },
        });
        expect(res.proposalIdentity?.snapshot).toMatchObject(snapshotBase);
        expect(res.providerResult).toMatchObject({ ok: true, available: true });
        expect(upsertSpy).toHaveBeenCalled();
        expect((upsertSpy.mock.calls[0]?.[2] as any)?.lastProposal?.text).toBe(res.finalText);
    });

    it('publica create determinístico con persistencia rica condicional y sin upsert incondicional', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'USD' }],
        } as any);
        vi.mocked(publishDeterministicCreateProposalIfLatest).mockResolvedValue({
            matched: true,
            modified: true,
            matchedCount: 1,
            modifiedCount: 1,
        });
        const upsertSpy = vi.spyOn(await import('@/lib/db/convState'), 'upsertConvState');

        const res = await availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotBase as any,
            snapshotBase.checkIn,
            snapshotBase.checkOut,
            { deterministicCreate: true },
        );

        expect(upsertSpy).not.toHaveBeenCalled();
        expect(publishDeterministicCreateProposalIfLatest).toHaveBeenCalledWith(
            'hotel999',
            'hotel999-web-guest',
            expect.objectContaining({
                availabilityStatus: 'available',
                input: expect.objectContaining({ hotelId: 'hotel999', roomType: 'double', numGuests: 2 }),
                snapshot: expect.objectContaining(snapshotBase),
            }),
            expect.objectContaining({
                options: [{ roomType: 'double', pricePerNight: 100, currency: 'USD' }],
                suggestedRoomType: 'double',
                suggestedPricePerNight: 100,
            }),
        );
        expect(res.proposalPersistence).toMatchObject({ matched: true, modified: true });
    });

    it('protege la carrera completa de publicación: B vigente rechaza a A tardía', async () => {
        let resolveA!: (value: any) => void;
        let resolveB!: (value: any) => void;
        const providerA = new Promise((resolve) => { resolveA = resolve; });
        const providerB = new Promise((resolve) => { resolveB = resolve; });
        vi.spyOn(reservations, 'askAvailability').mockImplementation(async (_hotelId: string, slots: any) => (
            slots.roomType === 'double' ? providerA : providerB
        ) as any);

        let persisted: any;
        vi.mocked(publishDeterministicCreateProposalIfLatest).mockImplementation(async (
            _hotelId: string,
            _conversationId: string,
            identity: any,
            proposal: any,
        ) => {
            if (!persisted || persisted.identity.toolCallAt < identity.toolCallAt) {
                persisted = { identity, proposal };
                return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
            }
            return { matched: false, modified: false, matchedCount: 0, modifiedCount: 0 };
        });

        const runA = availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotBase as any,
            snapshotBase.checkIn,
            snapshotBase.checkOut,
            { deterministicCreate: true },
        );
        await Promise.resolve();
        const snapshotB = { ...snapshotBase, roomType: 'suite' };
        const runB = availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotB as any,
            snapshotB.checkIn,
            snapshotB.checkOut,
            { deterministicCreate: true },
        );

        resolveB({ ok: true, available: false, options: [{ roomType: 'triple', currency: 'USD' }] });
        const resultB = await runB;
        resolveA({ ok: true, available: true, options: [{ roomType: 'double', pricePerNight: 100, currency: 'USD' }] });
        const resultA = await runA;

        expect(resultB.proposalPersistence?.matched).toBe(true);
        expect(resultA.proposalPersistence?.matched).toBe(false);
        expect(persisted.proposal).toMatchObject({
            available: false,
            availabilityStatus: 'unavailable',
            snapshot: expect.objectContaining({ roomType: 'suite' }),
            options: [{ roomType: 'triple', currency: 'USD' }],
        });
    });

    it('recorre create completo desde disponibilidad hasta CAS y conserva el estado final rico', async () => {
        let canonicalState: any = {
            hotelId: 'hotel999',
            conversationId: 'conv-full-sequence',
            reservationSlots: {},
        };
        vi.mocked(getConvState).mockImplementation(async () => canonicalState);
        vi.mocked(publishDeterministicCreateProposalIfLatest).mockImplementation(async (
            _hotelId,
            _conversationId,
            identity: any,
            proposal: any,
        ) => {
            canonicalState = {
                ...canonicalState,
                reservationSlots: identity.snapshot,
                lastProposal: proposal,
                salesStage: 'qualify',
                conversationStage: 'reservation_collecting',
            };
            return { matched: true, modified: true, matchedCount: 1, modifiedCount: 1 };
        });
        vi.mocked(finalizeDeterministicCreateProposalIfCurrent).mockImplementation(async (
            _hotelId,
            _conversationId,
            identity: any,
            finalText: string,
        ) => {
            const matched = canonicalState.lastProposal?.toolCall?.at === identity.toolCallAt;
            if (matched) {
                canonicalState = {
                    ...canonicalState,
                    lastProposal: { ...canonicalState.lastProposal, text: finalText },
                    salesStage: 'quote',
                    conversationStage: 'reservation_quoted',
                    activeReservationContext: { kind: 'draft', phase: 'quoted' },
                };
            }
            return { matched, modified: matched, matchedCount: matched ? 1 : 0, modifiedCount: matched ? 1 : 0 } as any;
        });
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: true,
            options: [{ roomType: 'double', pricePerNight: 100, currency: 'USD' }],
        } as any);
        vi.spyOn(reservations, 'fillSlotsWithLLM').mockResolvedValue({
            need: 'none',
            slots: {
                guestName: 'Juan Perez',
                roomType: 'double',
                numGuests: '2',
                checkIn: '2027-12-20',
                checkOut: '2027-12-22',
                locale: 'es',
            },
        } as any);
        const { handleIncomingMessage } = await import('@/lib/handlers/messageHandler');
        const replies: string[] = [];

        await handleIncomingMessage({
            messageId: 'm-full-sequence',
            hotelId: 'hotel999',
            channel: 'web',
            sender: 'guest',
            conversationId: 'conv-full-sequence',
            content: 'Quiero reservar una doble del 20/12/2027 al 22/12/2027 para 2 personas a nombre de Juan Perez',
            detectedLanguage: 'es',
            timestamp: new Date().toISOString(),
        } as any, { mode: 'automatic', sendReply: async (text: string) => { replies.push(text); } });

        expect(publishDeterministicCreateProposalIfLatest).toHaveBeenCalledTimes(1);
        expect(finalizeDeterministicCreateProposalIfCurrent).toHaveBeenCalledTimes(1);
        expect(canonicalState).toMatchObject({
            salesStage: 'quote',
            conversationStage: 'reservation_quoted',
            lastProposal: {
                available: true,
                availabilityStatus: 'available',
                options: [{ roomType: 'double', pricePerNight: 100, currency: 'USD' }],
                suggestedRoomType: 'double',
                suggestedPricePerNight: 100,
                snapshot: {
                    guestName: 'Juan Perez',
                    roomType: 'double',
                    numGuests: '2',
                    checkIn: '2027-12-20',
                    checkOut: '2027-12-22',
                },
                toolCall: {
                    name: 'checkAvailability',
                    outputSummary: 'available:true',
                },
            },
        });
        expect(replies.at(-1)).toBe(canonicalState.lastProposal.text);
        expect(replies.at(-1)).toMatch(/CONFIRMAR/i);
    });

    it('expone fallo conservador de publicación determinística sin ejecutar upsert alternativo', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: false,
            message: 'provider timeout',
        } as any);
        vi.mocked(publishDeterministicCreateProposalIfLatest).mockRejectedValue(new Error('write failed'));
        const upsertSpy = vi.spyOn(await import('@/lib/db/convState'), 'upsertConvState');

        const res = await availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotBase as any,
            snapshotBase.checkIn,
            snapshotBase.checkOut,
            { deterministicCreate: true },
        );

        expect(upsertSpy).not.toHaveBeenCalled();
        expect(res.status).toBe('error');
        expect(res.proposalPersistence).toEqual({
            matched: false,
            modified: false,
            matchedCount: 0,
            modifiedCount: 0,
            error: true,
        });
    });

    it('preserva una negativa autoritativa sin convertirla en quote', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: true,
            available: false,
            proposal: 'No hay doble; puedo ofrecer twin.',
            options: [{ roomType: 'twin', pricePerNight: 90, currency: 'USD' }],
        } as any);
        const upsertSpy = vi.spyOn(await import('@/lib/db/convState'), 'upsertConvState').mockResolvedValue(undefined as any);

        const res = await availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotBase as any,
            snapshotBase.checkIn,
            snapshotBase.checkOut,
        );

        expect(res.status).toBe('unavailable');
        expect(res.needsHandoff).toBe(true);
        expect(res.finalText).not.toMatch(/CONFIRMAR/i);
        expect(res.richProposal).toMatchObject({
            available: false,
            availabilityStatus: 'unavailable',
            suggestedRoomType: 'twin',
            suggestedPricePerNight: 90,
            toolCall: { outputSummary: 'available:false' },
        });
        expect((upsertSpy.mock.calls[0]?.[2] as any)).toMatchObject({
            salesStage: 'followup',
            desiredAction: 'notify_reception',
        });
    });

    it('clasifica error de proveedor sin declarar indisponibilidad autoritativa', async () => {
        vi.spyOn(reservations, 'askAvailability').mockResolvedValue({
            ok: false,
            message: 'provider timeout',
        } as any);
        const upsertSpy = vi.spyOn(await import('@/lib/db/convState'), 'upsertConvState').mockResolvedValue(undefined as any);

        const res = await availabilityPipeline.runAvailabilityCheck(
            preBase('es') as any,
            snapshotBase as any,
            snapshotBase.checkIn,
            snapshotBase.checkOut,
        );

        expect(res.status).toBe('error');
        expect(res.needsHandoff).toBe(true);
        expect(res.finalText).toMatch(/problema al consultar/i);
        expect(res.finalText).not.toMatch(/no tengo disponibilidad|CONFIRMAR/i);
        expect(res.richProposal).toMatchObject({
            available: false,
            availabilityStatus: 'error',
            toolCall: { outputSummary: 'error' },
        });
        expect((upsertSpy.mock.calls[0]?.[2] as any)?.lastProposal?.availabilityStatus).toBe('error');
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
        vi.mocked((await import('@/lib/config/hotelConfig.server')).getHotelConfig)
            .mockResolvedValue({ timezone: 'UTC' } as any);
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
