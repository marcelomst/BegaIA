import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import PDFDocument from "pdfkit";
import type { Channel } from "@/types/channel";
import { saveMessageToAstra } from "@/lib/db/messages";
import { sendWhatsAppText, sendWhatsAppDocument, isWhatsAppReady } from "@/lib/adapters/whatsappBaileysAdapter";

// Métricas en memoria (simple). Se podrían exportar a Prometheus en el futuro.
const waCopyMetrics = {
    attempts: 0,
    readinessWaits: 0,
    readinessFailures: 0,
    readinessSuccess: 0,
};
export function getWaCopyMetrics() { return { ...waCopyMetrics }; }

type SendWAOptions = {
    hotelId: string;
    toJid: string; // e.g., 54911XXXX@s.whatsapp.net
    conversationId?: string;
    channel?: Channel;
    summary: {
        guestName?: string;
        roomType?: string;
        checkIn?: string; // YYYY-MM-DD
        checkOut?: string; // YYYY-MM-DD
        numGuests?: string | number;
        reservationId?: string;
        locale?: string;
        hotelName?: string;
    };
    attachPdf?: boolean;
};

export async function sendReservationCopyWA(opts: SendWAOptions): Promise<void> {
    const { hotelId, toJid, summary, attachPdf = true, conversationId, channel } = opts;
    const config = await getHotelConfig(hotelId);
    const waCfg: any = config?.channelConfigs?.whatsapp;
    if (!waCfg?.enabled) {
        if (!process.env.WA_DEV_ALLOW_DISABLED) {
            throw new Error("WhatsApp channel not enabled for this hotel");
        } else {
            console.warn("[wa-copy] Bypass: canal WhatsApp deshabilitado pero WA_DEV_ALLOW_DISABLED activo");
        }
    }

    // === i18n del resumen ===
    const locale = summary.locale?.toLowerCase() || "es";
    const L = (key: string, fallback: string) => {
        const dict: Record<string, Record<string, string>> = {
            es: {
                intro: `Hola${summary.guestName ? ` ${summary.guestName}` : ""}! Aquí va una copia del resumen de tu reserva`,
                code: "código",
                room: "Habitación",
                dates: "Fechas",
                stay: "Estadía",
                guests: "Huéspedes",
            },
            en: {
                intro: `Hi${summary.guestName ? ` ${summary.guestName}` : ""}! Here's a copy of your booking summary`,
                code: "code",
                room: "Room",
                dates: "Dates",
                stay: "Stay",
                guests: "Guests",
            },
            pt: {
                intro: `Olá${summary.guestName ? ` ${summary.guestName}` : ""}! Aqui está a cópia do resumo da sua reserva`,
                code: "código",
                room: "Quarto",
                dates: "Datas",
                stay: "Estadia",
                guests: "Hóspedes",
            }
        };
        return dict[locale]?.[key] || dict.es[key] || fallback;
    };

    const intro = L('intro', 'Resumen de tu reserva');
    const codeLine = summary.reservationId ? ` (${L('code', 'código')} ${summary.reservationId})` : "";
    const lines: string[] = [];
    lines.push(`${intro}${codeLine}:`);
    if (summary.roomType) lines.push(`• ${L('room', 'Habitación')}: ${summary.roomType}`);
    if (summary.checkIn && summary.checkOut) lines.push(`• ${L('dates', 'Fechas')}: ${summary.checkIn} → ${summary.checkOut}`);
    if (summary.numGuests) lines.push(`• ${L('guests', 'Huéspedes')}: ${summary.numGuests}`);
    if (config?.hotelName || config?.address || config?.city) {
        lines.push(`${config?.hotelName ? config.hotelName + " — " : ""}${config?.address || config?.city || ""}`);
    }

    // Esperar readiness con combinación: timeout ampliado + backoff incremental + logging
    const readinessStart = Date.now();
    waCopyMetrics.attempts++;
    const BASE_WAIT_MS = Number(process.env.WA_READY_TIMEOUT_MS || 6000); // antes 5000, ahora configurable
    const EXTRA_BACKOFFS = (process.env.WA_READY_BACKOFFS || "500,1000,1500")
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n) && n > 0);
    if (!isWhatsAppReady()) {
        waCopyMetrics.readinessWaits++;
        while (!isWhatsAppReady() && Date.now() - readinessStart < BASE_WAIT_MS) {
            await new Promise(r => setTimeout(r, 250));
        }
    }
    let extraAttempts = 0;
    if (!isWhatsAppReady()) {
        // Backoff incremental adicional
        for (const d of EXTRA_BACKOFFS) {
            await new Promise(r => setTimeout(r, d));
            extraAttempts++;
            if (isWhatsAppReady()) break;
        }
    }
    if (isWhatsAppReady()) {
        const waited = Date.now() - readinessStart;
        if (waited > 0) {
            waCopyMetrics.readinessSuccess++;
            console.log(`[wa-copy] readiness acquired in ${waited}ms (extraAttempts=${extraAttempts})`);
        }
    } else {
        const waited = Date.now() - readinessStart;
        waCopyMetrics.readinessFailures++;
        console.warn(`[wa-copy] WA_NOT_READY after ${waited}ms (attempts=${extraAttempts})`);
        const err: any = new Error("WhatsApp socket not ready");
        err.code = "WA_NOT_READY";
        throw err;
    }
    // 1) Enviar texto
    await sendWhatsAppText(toJid, lines.join("\n"));

    // 2) Adjuntar PDF (opcional, no fatal)
    if (attachPdf) {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks: Buffer[] = [];
            doc.on("data", (c: Buffer) => chunks.push(c));
            doc.fontSize(18).text(summary.hotelName || config?.hotelName || "Hotel", { align: "left" });
            doc.moveDown(0.5);
            const pdfTitle = locale.startsWith('pt') ? 'Reserva' : locale.startsWith('en') ? 'Booking' : 'Reserva';
            doc.fontSize(12).text(`${pdfTitle}${summary.reservationId ? ` #${summary.reservationId}` : ""}`, { align: "left" });
            doc.moveDown();
            const pdfGuest = locale.startsWith('pt') ? 'Hóspede' : locale.startsWith('en') ? 'Guest' : 'Huésped';
            const pdfRoom = locale.startsWith('pt') ? 'Quarto' : locale.startsWith('en') ? 'Room' : 'Habitación';
            const pdfStay = locale.startsWith('pt') ? 'Estadia' : locale.startsWith('en') ? 'Stay' : 'Estadía';
            const pdfGuests = locale.startsWith('pt') ? 'Hóspedes' : locale.startsWith('en') ? 'Guests' : 'Huéspedes';
            if (summary.guestName) doc.text(`${pdfGuest}: ${summary.guestName}`);
            if (summary.roomType) doc.text(`${pdfRoom}: ${summary.roomType}`);
            if (summary.checkIn && summary.checkOut) doc.text(`${pdfStay}: ${summary.checkIn} → ${summary.checkOut}`);
            if (summary.numGuests) doc.text(`${pdfGuests}: ${summary.numGuests}`);
            if (config?.address) doc.moveDown().text(`${config.hotelName || ""} — ${config.address}`, { align: "left" });
            doc.end();

            const buffer: Buffer = await new Promise((resolve, reject) => {
                doc.on("end", () => resolve(Buffer.concat(chunks)));
                doc.on("error", reject);
            });
            await sendWhatsAppDocument(
                toJid,
                buffer,
                `reserva${summary.reservationId ? `-${summary.reservationId}` : ""}.pdf`,
                "application/pdf"
            );
        } catch (err) {
            console.warn("[wa-copy.pdf] Advertencia: no se pudo generar/enviar el PDF:", (err as any)?.message || err);
        }
    }

    // 3) Auditoría
    const messageId = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await saveMessageToAstra({
        messageId,
        hotelId,
        channel: channel || ("whatsapp" as any),
        sender: "ai",
        role: "ai",
        direction: "out",
        status: "sent",
        content: `Copia de reserva enviada por WhatsApp a ${toJid}`,
        subject: `Copia de reserva${summary.reservationId ? ` #${summary.reservationId}` : ""}`,
        conversationId: conversationId || null,
        meta: {
            category: "send_whatsapp_copy",
            reservationId: summary.reservationId,
            toJid,
            attachPdf: !!attachPdf,
        },
        timestamp: new Date().toISOString(),
    });
}
