import { describe, it, expect, vi, beforeEach } from 'vitest';

// Desactivar structured para aislar paths
process.env.STRUCTURED_ENABLED = 'false';

// Mocks infra mínimos (no necesitamos el graph aquí)
vi.mock('@/lib/email/sendReservationCopy', () => ({
    sendReservationCopy: vi.fn(async () => { /* noop */ }),
}));
vi.mock('@/lib/whatsapp/sendReservationCopyWA', () => ({
    sendReservationCopyWA: vi.fn(async () => { /* noop */ }),
}));
vi.mock('@/lib/adapters/whatsappBaileysAdapter', () => ({
    isWhatsAppReady: vi.fn(() => true),
}));

// Mock dispatch remoto (publish)
vi.mock('@/lib/whatsapp/dispatch', () => ({
    publishSendReservationCopy: vi.fn(async () => ({ published: true, requestId: 'req-test' })),
}));

// Mock redis services para ACK loop
vi.mock('@/lib/services/redis', () => {
    const store = new Map<string, string>();
    return {
        redis: {
            get: vi.fn(async (k: string) => store.get(k) || null),
            set: vi.fn(async (k: string, v: string) => { store.set(k, v); return 'OK'; }),
            publish: vi.fn(async () => 1),
            duplicate: vi.fn(() => ({ subscribe: vi.fn(), on: vi.fn() })),
        }
    };
});

import { detectQuickIntent, handleQuickIntent } from '@/lib/handlers/pipeline/quickIntents';
import { sendReservationCopy } from '@/lib/email/sendReservationCopy';
import { sendReservationCopyWA } from '@/lib/whatsapp/sendReservationCopyWA';
import { isWhatsAppReady } from '@/lib/adapters/whatsappBaileysAdapter';
import { publishSendReservationCopy } from '@/lib/whatsapp/dispatch';

function basePre(partial: Partial<any> & { msgText?: string }) {
    const msgText = partial.msgText ?? 'Hola';
    return {
        lang: partial.lang || 'es',
        st: partial.st || {},
        lcHistory: partial.lcHistory || [],
        msg: {
            hotelId: 'hotel999',
            channel: partial.channel || 'web',
            conversationId: partial.conversationId || 'conv-qint',
            content: msgText,
            guestId: partial.guestId,
        },
        conversationId: partial.conversationId || 'conv-qint',
        prevCategory: partial.prevCategory || null,
        currSlots: partial.currSlots || {},
    };
}

describe('quickIntents: detectQuickIntent', () => {
    it('detecta email strict sin dirección -> askedForAddress', () => {
        const pre = basePre({ msgText: '¿Me podés enviar una copia por correo?' });
        const d = detectQuickIntent(pre, pre.msg.content);
        expect(d).toMatchObject({ kind: 'email', mode: 'strict', askedForAddress: true, hasAddressOrPhone: false });
    });
    it('detecta email strict con dirección inline', () => {
        const pre = basePre({ msgText: 'Enviá una copia al email cliente@test.com' });
        const d = detectQuickIntent(pre, pre.msg.content);
        expect(d).toMatchObject({ kind: 'email', mode: 'strict', emailAddress: 'cliente@test.com', hasAddressOrPhone: true });
    });
    it('detecta email light (sin "copia") con contexto de reserva', () => {
        const pre = basePre({ msgText: 'Mandame por email', st: { lastReservation: { reservationId: 'R1' } } });
        const d = detectQuickIntent(pre, pre.msg.content);
        expect(d).toMatchObject({ kind: 'email', mode: 'light' });
    });
    it('follow-up email: prevCategory send_email_copy + dirección', () => {
        const pre = basePre({ msgText: 'cliente2@test.com', prevCategory: 'send_email_copy' });
        const d = detectQuickIntent(pre, pre.msg.content);
        expect(d).toMatchObject({ kind: 'email', mode: 'followup', emailAddress: 'cliente2@test.com' });
    });
    it('detecta whatsapp strict con palabra copia', () => {
        const pre = basePre({ msgText: 'Mandame la copia por WhatsApp' });
        const d = detectQuickIntent(pre, pre.msg.content);
        expect(d).toMatchObject({ kind: 'whatsapp', mode: 'strict' });
    });
    it('detecta whatsapp light (share) con reserva reciente (acentos soportados)', () => {
        const pre = basePre({ msgText: 'Compartí por whatsapp', st: { lastReservation: { reservationId: 'R2' } } });
        const d = detectQuickIntent(pre, pre.msg.content);
        expect(d).toMatchObject({ kind: 'whatsapp', mode: 'light' });
    });
    it('follow-up whatsapp: prevCategory send_whatsapp_copy + número', () => {
        const pre = basePre({ msgText: '+5491100000000', prevCategory: 'send_whatsapp_copy' });
        const d = detectQuickIntent(pre, pre.msg.content);
        expect(d).toMatchObject({ kind: 'whatsapp', mode: 'followup', phoneDigits: expect.any(String) });
    });
});

describe('quickIntents: handleQuickIntent (email)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('pide dirección cuando falta (strict)', async () => {
        const pre = basePre({ msgText: 'Mandame una copia por correo' });
        const r = await handleQuickIntent(pre, {});
        expect(r).toMatchObject({ handled: true, nextCategory: 'send_email_copy' });
        expect(r?.finalText?.toLowerCase()).toMatch(/correo|e-?mail|email/);
        expect(vi.mocked(sendReservationCopy).mock.calls.length).toBe(0);
    });

    it('envía cuando hay dirección inline', async () => {
        const pre = basePre({ msgText: 'Mandame una copia al correo demo@test.com' });
        const r = await handleQuickIntent(pre, {});
        expect(r).toMatchObject({ handled: true, nextCategory: 'send_email_copy' });
        expect(r?.finalText).toMatch(/demo@test.com/);
        expect(vi.mocked(sendReservationCopy).mock.calls.length).toBe(1);
    });

    it('follow-up: recibe email después de preguntar', async () => {
        const preAsk = basePre({ msgText: 'Mandame la copia por correo' });
        const ask = await handleQuickIntent(preAsk, {});
        expect(ask?.finalText).toMatch(/correo|mail/i);
        const preFU = basePre({ msgText: 'cliente@foo.com', prevCategory: 'send_email_copy' });
        const fu = await handleQuickIntent(preFU, {});
        expect(fu?.finalText).toMatch(/cliente@foo.com/);
    });

    it('en doble error de envío email ofrece reintento sin escalar inmediatamente', async () => {
        vi.mocked(sendReservationCopy)
            .mockImplementationOnce(async () => { throw new Error('SMTP fail 1'); })
            .mockImplementationOnce(async () => { throw new Error('SMTP fail 2'); });
        const pre = basePre({ msgText: 'Enviá una copia a err@test.com' });
        const r = await handleQuickIntent(pre, {});
        expect(r?.needsSupervision).toBe(false); // nueva política: no escalamos de inmediato
        expect(r?.finalText).toMatch(/intente de nuevo|retry|reintento|¿Querés que lo intente|¿Querés que lo intente de nuevo|configurad/i);
    });

    it('en fallo recuperado tras reintento indica éxito', async () => {
        vi.mocked(sendReservationCopy)
            .mockImplementationOnce(async () => { throw new Error('SMTP blip'); });
        const pre = basePre({ msgText: 'Enviá una copia a okafter@test.com' });
        const r = await handleQuickIntent(pre, {});
        expect(r?.needsSupervision).toBe(false);
        expect(r?.finalText).toMatch(/okafter@test.com/);
    });
});

describe('quickIntents: handleQuickIntent (whatsapp)', () => {
    // imports ya realizados arriba; las funciones están mockeadas por vi.mock

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.WA_REMOTE_DISPATCH = '1'; // habilita dispatch remoto para tests
    });

    it('envía directamente cuando guestId ya es JID y se pide copia', async () => {
        const pre = basePre({ msgText: 'Mandame la copia por WhatsApp', channel: 'whatsapp', guestId: '5491100000000@s.whatsapp.net', conversationId: 'hotel999-whatsapp-5491100000000@s.whatsapp.net' });
        const r = await handleQuickIntent(pre, {});
        expect(r?.finalText?.toLowerCase()).toMatch(/whatsapp/);
        expect(vi.mocked(sendReservationCopyWA).mock.calls.length).toBe(1);
    });

    it('pide número si no hay JID ni número inline', async () => {
        const pre = basePre({ msgText: 'Mandame la copia por WhatsApp', channel: 'web' });
        const r = await handleQuickIntent(pre, {});
        expect(r?.finalText).toMatch(/número.*whatsapp/i);
        expect(r?.nextCategory).toBe('send_whatsapp_copy');
    });

    it('follow-up: recibe número luego de pedirlo', async () => {
        const preAsk = basePre({ msgText: 'Compartí por whatsapp', st: { lastReservation: { reservationId: 'R3' } } });
        const ask = await handleQuickIntent(preAsk, {});
        expect(ask?.nextCategory).toBe('send_whatsapp_copy');
        const preFU = basePre({ msgText: '+5491100000000', prevCategory: 'send_whatsapp_copy' });
        const fu = await handleQuickIntent(preFU, {});
        expect(fu?.finalText).toMatch(/whatsapp/i);
    });

    it('usa dispatch remoto cuando isWhatsAppReady = false', async () => {
        vi.mocked(isWhatsAppReady).mockReturnValueOnce(false);
        const pre = basePre({ msgText: 'Mandame la copia por WhatsApp', channel: 'whatsapp', guestId: '5491100000000@s.whatsapp.net', conversationId: 'hotel999-whatsapp-5491100000000@s.whatsapp.net' });
        const r = await handleQuickIntent(pre, {});
        expect(vi.mocked(publishSendReservationCopy).mock.calls.length).toBe(1);
        expect(r?.finalText).toMatch(/whatsapp/i);
    });

    it('marca needsSupervision cuando WA sender lanza error distinto a WA_NOT_READY', async () => {
        vi.mocked(sendReservationCopyWA).mockRejectedValueOnce(Object.assign(new Error('boom'), { code: 'OTHER' }));
        const pre = basePre({ msgText: 'Mandame la copia por WhatsApp', channel: 'whatsapp', guestId: '5491100000000@s.whatsapp.net', conversationId: 'hotel999-whatsapp-5491100000000@s.whatsapp.net' });
        const r = await handleQuickIntent(pre, {});
        expect(r?.needsSupervision).toBe(true);
        expect(r?.finalText).toMatch(/No pude enviar|não consegui|couldn\'t send/i);
    });
});
