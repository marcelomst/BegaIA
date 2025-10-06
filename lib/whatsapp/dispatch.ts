import { redis } from '@/lib/services/redis';
import type { Channel } from '@/types/channel';

// Canal Redis para despachar envíos de copia WA entre procesos
const CHANNEL = 'wa:send-copy';

export type WaSendCopyPayload = {
    hotelId: string;
    toJid: string;
    conversationId?: string | null;
    channel?: Channel;
    summary: {
        guestName?: string;
        roomType?: string;
        checkIn?: string;
        checkOut?: string;
        numGuests?: string | number;
        reservationId?: string;
        locale?: string;
        hotelName?: string;
    };
    attachPdf?: boolean;
    requestedAt: string; // ISO
    requestId: string;   // para trazabilidad
};

export async function publishSendReservationCopy(payload: Omit<WaSendCopyPayload, 'requestedAt' | 'requestId'>): Promise<{ published: boolean; requestId?: string; }> {
    const enabled = process.env.WA_REMOTE_DISPATCH !== '0' && process.env.WA_REMOTE_DISPATCH !== 'false';
    if (!enabled) return { published: false };
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const full: WaSendCopyPayload = { ...payload, requestedAt: new Date().toISOString(), requestId };
    try {
        await redis.publish(CHANNEL, JSON.stringify(full));
        console.log('[wa-dispatch] publicado', CHANNEL, requestId, 'toJid=', payload.toJid);
        return { published: true, requestId };
    } catch (err) {
        console.warn('[wa-dispatch] error publicando', (err as any)?.message || err);
        return { published: false };
    }
}

// Subscriber helper (usado en channelBot)
export async function subscribeSendReservationCopy(handler?: (p: WaSendCopyPayload) => Promise<void>) {
    const sub = redis.duplicate();
    await sub.subscribe(CHANNEL);
    sub.on('message', async (chan: string, raw: string) => {
        if (chan !== CHANNEL) return;
        let parsed: WaSendCopyPayload | undefined;
        try { parsed = JSON.parse(raw); } catch { return; }
        if (!parsed?.hotelId || !parsed.toJid) return;
        if (process.env.NODE_ENV !== 'production') {
            console.log('[wa-dispatch] recibido', parsed.requestId, 'toJid=', parsed.toJid);
        }
        try {
            if (handler) {
                await handler(parsed);
            } else {
                const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');
                await sendReservationCopyWA({
                    hotelId: parsed.hotelId,
                    toJid: parsed.toJid,
                    conversationId: parsed.conversationId || undefined,
                    channel: parsed.channel,
                    summary: parsed.summary,
                    attachPdf: parsed.attachPdf,
                });
            }
            // ACK en Redis para permitir confirmación temprana opcional
            if (parsed.requestId) {
                try {
                    await redis.set(`wa:ack:${parsed.requestId}`, 'ok', 'EX', 60);
                } catch { }
            }
        } catch (err) {
            console.warn('[wa-dispatch] fallo procesando', parsed.requestId, (err as any)?.message || err);
        }
    });
    console.log('[wa-dispatch] suscrito canal', CHANNEL);
    return sub;
}
