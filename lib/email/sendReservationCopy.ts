import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { sendEmail } from "@/lib/email/sendEmail";
import { resolveEmailCredentials, EMAIL_SENDING_ENABLED } from "@/lib/email/resolveEmailCredentials";
import PDFDocument from "pdfkit"; // Usado primariamente; fallback a pdf-lib si falla métricas AFM
import { saveMessageToAstra } from "@/lib/db/messages";
import type { Channel } from "@/types/channel";

type SendReservationCopyOptions = {
    hotelId: string;
    to: string;
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

const EMAIL_ATTACH_ENABLED = process.env.EMAIL_ATTACH_PDF !== '0' && process.env.EMAIL_ATTACH_PDF !== 'false';

export async function sendReservationCopy(opts: SendReservationCopyOptions): Promise<void> {
    const { hotelId, to, summary, attachPdf = true, conversationId, channel } = opts;
    const config = await getHotelConfig(hotelId);
    const emailCfg: any = config?.channelConfigs?.email;
    if (!emailCfg?.smtpHost || !emailCfg?.smtpPort || !emailCfg?.dirEmail) {
        throw new Error("Email channel not configured for this hotel");
    }
    if (!EMAIL_SENDING_ENABLED) {
        throw new Error("EMAIL_SENDING_DISABLED");
    }
    const creds = resolveEmailCredentials(emailCfg);
    if (!creds || creds.source === 'none' || !creds.pass) {
        console.error('[email-copy] Credenciales faltantes', {
            hotelId,
            hasConfig: !!emailCfg,
            source: creds?.source,
            reason: creds?.reason,
            secretRef: emailCfg?.secretRef || null,
        });
        throw new Error("Email credentials not available (secretRef/password missing)");
    }
    console.log('[email-copy] Usando credenciales', {
        hotelId,
        user: creds.user,
        host: creds.host,
        port: creds.port,
        secure: creds.secure ?? false,
        source: creds.source,
        secretRef: emailCfg.secretRef || null,
    });

    const subject = `Copia de tu reserva - ${config?.hotelName || "Hotel"}`;
    const lines: string[] = [];
    lines.push(`<p>Hola${summary.guestName ? ` ${summary.guestName}` : ""},</p>`);
    lines.push(`<p>Adjuntamos un resumen de tu reserva${summary.reservationId ? ` (código <b>${summary.reservationId}</b>)` : ""}:</p>`);
    lines.push("<ul>");
    if (summary.roomType) lines.push(`<li>Habitación: <b>${summary.roomType}</b></li>`);
    if (summary.checkIn && summary.checkOut) lines.push(`<li>Fechas: <b>${summary.checkIn}</b> → <b>${summary.checkOut}</b></li>`);
    if (summary.numGuests) lines.push(`<li>Huéspedes: <b>${summary.numGuests}</b></li>`);
    lines.push("</ul>");
    lines.push(`<p>${config?.hotelName ? config.hotelName + " — " : ""}${config?.address || config?.city || ""}</p>`);
    lines.push(`<p>Gracias por elegirnos.</p>`);

    // Optional: generate a simple one-page PDF summary (non-fatal on errors)
    let attachments: any[] | undefined;
    if (attachPdf && EMAIL_ATTACH_ENABLED) {
        let pdfBuffer: Buffer | undefined;
        let filename = `reserva${summary.reservationId ? `-${summary.reservationId}` : ""}.pdf`;
        // Sanitizador simple para caracteres fuera de WinAnsi (ej: flecha →) cuando usamos fuentes estándar embebidas
        const sanitizeForPdf = (txt: string) => {
            if (!txt) return txt;
            // Reemplazos simples primero
            let out = txt
                .replace(/\u2192/g, '->') // flecha larga
                .replace(/→/g, '->')
                // Reemplazos comunes de caracteres tipográficos que a veces fallan en WinAnsi
                .replace(/[“”«»]/g, '"')
                .replace(/[‘’]/g, "'")
                .replace(/–|—/g, '-');

            // Evitar caracteres de control no imprimibles sin usar regex con rangos de control
            // Equivalente a eliminar \x00-\x08, \x0B, \x0C, \x0E-\x1F (permitiendo tab 0x09, LF 0x0A, CR 0x0D)
            const filtered = Array.from(out)
                .filter((ch) => {
                    const code = ch.charCodeAt(0);
                    if (code <= 0x1F) {
                        // permitir tab, newline y carriage return
                        return code === 0x09 || code === 0x0A || code === 0x0D;
                    }
                    return true;
                })
                .join('');
            return filtered;
        };
        try {
            const doc = new PDFDocument({ margin: 50 });
            const chunks: Buffer[] = [];
            doc.on("data", (c: Buffer) => chunks.push(c));
            doc.fontSize(18).text(summary.hotelName || config?.hotelName || "Hotel", { align: "left" });
            doc.moveDown(0.5);
            doc.fontSize(12).text(`Reserva${summary.reservationId ? ` #${summary.reservationId}` : ""}`, { align: "left" });
            doc.moveDown();
            if (summary.guestName) doc.text(`Huésped: ${summary.guestName}`);
            if (summary.roomType) doc.text(`Habitación: ${summary.roomType}`);
            if (summary.checkIn && summary.checkOut) doc.text(`Estadía: ${summary.checkIn} -> ${summary.checkOut}`); // usar -> para evitar problemas de codificación en fallback
            if (summary.numGuests) doc.text(`Huéspedes: ${summary.numGuests}`);
            if (config?.address) doc.moveDown().text(`${config.hotelName || ""} — ${config.address}`, { align: "left" });
            doc.end();
            pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
                doc.on("end", () => resolve(Buffer.concat(chunks)));
                doc.on("error", reject);
            });
            console.log('[email-copy.pdf] generado(pdfkit)', filename, 'bytes=', pdfBuffer.length);
        } catch (err) {
            const msg = (err as any)?.message || String(err);
            console.warn('[email-copy.pdf] pdfkit fallo, intento fallback pdf-lib:', msg);
            // Fallback con pdf-lib (no depende de archivos AFM en FS)
            try {
                const { PDFDocument: PDFLibDocument, StandardFonts } = await import('pdf-lib');
                const pdfDoc = await PDFLibDocument.create();
                const page = pdfDoc.addPage();
                const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                const fontSize = 12;
                const margin = 50;
                let y = page.getHeight() - margin;
                const write = (line: string, size = fontSize) => {
                    if (y < margin) {
                        y = page.getHeight() - margin;
                    }
                    page.drawText(line, { x: margin, y: y - size, size, font });
                    y -= size + 6;
                };
                write(sanitizeForPdf(summary.hotelName || config?.hotelName || 'Hotel'), 18);
                write(sanitizeForPdf(`Reserva${summary.reservationId ? ' #' + summary.reservationId : ''}`));
                if (summary.guestName) write(sanitizeForPdf(`Huésped: ${summary.guestName}`));
                if (summary.roomType) write(sanitizeForPdf(`Habitación: ${summary.roomType}`));
                if (summary.checkIn && summary.checkOut) write(sanitizeForPdf(`Estadía: ${summary.checkIn} -> ${summary.checkOut}`));
                if (summary.numGuests) write(sanitizeForPdf(`Huéspedes: ${summary.numGuests}`));
                if (config?.address) write(sanitizeForPdf(`${config.hotelName || ''} — ${config.address}`));
                const bytes = await pdfDoc.save();
                pdfBuffer = Buffer.from(bytes);
                console.log('[email-copy.pdf] generado(pdf-lib)', filename, 'bytes=', pdfBuffer.length);
            } catch (fallbackErr) {
                console.warn('[email-copy.pdf] fallback pdf-lib también falló:', (fallbackErr as any)?.message || fallbackErr);
            }
        }
        if (pdfBuffer) {
            attachments = [
                {
                    filename,
                    content: pdfBuffer,
                    contentType: 'application/pdf',
                },
            ];
        } else {
            attachments = undefined;
        }
    } else if (!EMAIL_ATTACH_ENABLED) {
        console.log('[email-copy.pdf] omitido por EMAIL_ATTACH_PDF flag (adjuntos deshabilitados)');
    }

    let sendErr: any;
    try {
        await sendEmail({
            host: creds.host,
            port: creds.port,
            user: creds.user,
            pass: creds.pass,
            secure: creds.secure ?? false,
        }, to, subject, lines.join("\n"), attachments);
    } catch (err) {
        sendErr = err;
        const rawMsg = (err as any)?.message || String(err);
        const invalidLogin = /invalid login|username and password not accepted|535-5\.7\.8/i.test(rawMsg);
        console.warn('[email-copy] fallo en sendEmail primer intento:', rawMsg, 'attachments?', !!attachments);
        // Fallback: si cred.source es inline y existe EMAIL_PASS distinto → reintentar
        if (invalidLogin && creds.source === 'inline') {
            const alt = process.env.EMAIL_PASS;
            if (alt && alt !== creds.pass) {
                console.log('[email-copy] Reintentando con EMAIL_PASS (fallback)');
                try {
                    await sendEmail({
                        host: creds.host,
                        port: creds.port,
                        user: creds.user,
                        pass: alt,
                        secure: creds.secure ?? false,
                    }, to, subject, lines.join("\n"), attachments);
                    console.log('[email-copy] Envío exitoso tras fallback EMAIL_PASS');
                    sendErr = null;
                } catch (err2) {
                    console.warn('[email-copy] Fallback EMAIL_PASS también falló:', (err2 as any)?.message || err2);
                    sendErr = err2;
                }
            }
        }
        if (sendErr) throw sendErr;
    }

    // Persist an audit message for traceability
    const messageId = (globalThis as any).crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    await saveMessageToAstra({
        messageId,
        hotelId,
        channel: channel || ("web" as any),
        sender: "ai",
        role: "ai",
        direction: "out",
        status: "sent",
        content: `Email de copia de reserva enviado a ${to}`,
        subject,
        conversationId: conversationId || null,
        originalMessageId: undefined,
        meta: {
            category: "send_email_copy",
            reservationId: summary.reservationId,
            to,
            attachPdf: !!attachments?.length,
            attemptedAttach: attachPdf && EMAIL_ATTACH_ENABLED,
        },
        timestamp: new Date().toISOString(),
    });
}
