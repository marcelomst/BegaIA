// Path: lib/handlers/pipeline/quickIntents.ts
// Extrae la detección y manejo de quick intents (email / whatsapp copy) que antes vivían inline en bodyLLM.
// Objetivo: reducir tamaño de messageHandler y permitir pruebas unitarias aisladas.

import { buildReservationCopySummary } from './stateSelectors';

export interface PreLite {
    lang?: string;
    st?: any;
    lcHistory?: any[];
    msg: any; // ChannelMessage simplificado
    conversationId: string;
    prevCategory?: string | null;
    currSlots: any;
}

export type QuickIntentKind = 'email' | 'whatsapp';
export type QuickIntentMode = 'strict' | 'light' | 'followup';

export interface QuickIntentDetection {
    kind: QuickIntentKind;
    mode: QuickIntentMode;
    // Datos extraídos:
    emailAddress?: string;   // para email
    phoneDigits?: string;    // para whatsapp
    hasAddressOrPhone: boolean;
    // Flags contextuales
    askedForAddress?: boolean; // cuando debemos pedirlo
    askedForPhone?: boolean;
}

// Reutiliza la misma heurística que en messageHandler (copiada para evitar dependencia circular)
export function hasRecentReservationMentionLite(pre: PreLite): boolean {
    if (pre.st?.lastReservation) return true;
    try {
        const lastAis = [...(pre.lcHistory || [])].reverse().filter(m => (m as any)._getType?.() === 'ai').slice(0, 4);
        return lastAis.some(m => /reserva\s+confirmada|booking\s+confirmed|tienes\s+una\s+reserva|you\s+have\s+a\s+confirmed\s+booking/i.test(String((m as any).content || '')));
    } catch { /* noop */ }
    return false;
}

// Detecta si el texto contiene alguno de los quick intents soportados.
export function detectQuickIntent(pre: PreLite, textRaw: string): QuickIntentDetection | null {
    const text = String(textRaw || '');
    // Strict email copy
    const emailRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
    {
        const hasCopy = /\b(copia|copy)\b/i.test(text);
        const hasEmailWord = /\b(correo|e-?mail|email|mail)\b/i.test(text);
        const inlineEmail = text.match(emailRegex)?.[0];
        if (hasCopy && (hasEmailWord || inlineEmail)) {
            return {
                kind: 'email',
                mode: 'strict',
                emailAddress: inlineEmail,
                hasAddressOrPhone: Boolean(inlineEmail),
                askedForAddress: !inlineEmail,
            };
        }
    }
    // Light email (sin 'copia')
    {
        const emailLightRegex = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
        const hasEmailAddr = emailLightRegex.test(text);
        const lightVerb = /(envi|mand|pas|compart)[a-záéíóú]*|send|mail\s*me/i.test(text);
        const mentionsEmailWord = /correo|e-?mail|email|mail/i.test(text);
        const recent = hasRecentReservationMentionLite(pre);
        if (recent && lightVerb && (hasEmailAddr || mentionsEmailWord)) {
            const mail = text.match(emailLightRegex)?.[0];
            return {
                kind: 'email',
                mode: 'light',
                emailAddress: mail,
                hasAddressOrPhone: Boolean(mail),
                askedForAddress: !mail,
            };
        }
    }
    // Strict WhatsApp (requiere palabra copia/copy) — detectar antes de email para evitar captura errónea
    const waAskRE = /((envi|mand)[a-záéíóú]*\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|pued(?:es|e|o|en|an|ís|es)?\s+enviar\b[^\n]*\b(copia|copy)[^\n]*\b(whats?app|whas?tapp|wasap|wpp)|send\b[^\n]*copy[^\n]*(whats?app|whas?tapp))/i;
    if (waAskRE.test(text)) {
        const phoneInline = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
        const digits = phoneInline ? phoneInline[1].replace(/\D/g, '') : undefined;
        return {
            kind: 'whatsapp',
            mode: 'strict',
            phoneDigits: digits,
            hasAddressOrPhone: Boolean(digits),
            askedForPhone: !digits,
        };
    }
    // Light WhatsApp (peticiones sin la palabra 'copia'). Incluimos acentos: compartí, enviá, mandá.
    {
        const waLightAskRE = /(compart[ií](?:r|rla|rme|ime|ila|la)?|pasa(?:la|mela)?|mand[aá](?:la|mela)?|envi[aá](?:la|mela)?|send|share)[^\n]{0,80}?\b(?:por|via|en|no|on)?\s*(whats?app|whas?tapp|wasap|wpp)\b/i;
        const recent = hasRecentReservationMentionLite(pre) || pre.st?.lastReservation;
        if (recent && waLightAskRE.test(text)) {
            const phoneInline = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
            const digits = phoneInline ? phoneInline[1].replace(/\D/g, '') : undefined;
            return {
                kind: 'whatsapp',
                mode: 'light',
                phoneDigits: digits,
                hasAddressOrPhone: Boolean(digits),
                askedForPhone: !digits,
            };
        }
    }
    // Follow-up categories (solicitado turno anterior)
    if (pre.prevCategory === 'send_email_copy') {
        const emailRegexFU = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
        const mail = text.match(emailRegexFU)?.[0];
        if (mail) return { kind: 'email', mode: 'followup', emailAddress: mail, hasAddressOrPhone: true };
    }
    if (pre.prevCategory === 'send_whatsapp_copy') {
        const phoneInline = text.match(/(\+?\d[\d\s\-().]{6,}\d)/);
        const digits = phoneInline ? phoneInline[1].replace(/\D/g, '') : undefined;
        if (digits) return { kind: 'whatsapp', mode: 'followup', phoneDigits: digits, hasAddressOrPhone: true };
    }
    return null;
}

export interface QuickIntentHandleResult {
    handled: boolean;
    finalText?: string;
    nextCategory?: string | null;
    nextSlots?: any;
    needsSupervision?: boolean;
}

// Maneja el intent si fue detectado. Devuelve estructura similar a bodyLLM early-return.
export async function handleQuickIntent(pre: PreLite, nextSlots: any): Promise<QuickIntentHandleResult | null> {
    const detection = detectQuickIntent(pre, String(pre.msg.content || ''));
    if (!detection) return null;
    const lang = pre.lang || 'es';
    const toDDMMYYYY = (iso?: string) => {
        if (!iso) return iso;
        const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/);
        return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
    };

    // Email flows
    if (detection.kind === 'email') {
        if (!detection.hasAddressOrPhone) {
            const ask = lang === 'es' ? '¿A qué correo te la envío?' : lang === 'pt' ? 'Para qual e-mail devo enviar?' : 'Which email should I send it to?';
            return { handled: true, finalText: ask, nextCategory: 'send_email_copy', nextSlots, needsSupervision: false };
        }
        // Envío con un reintento ligero y fallback NO supervisado inicial
        const { sendReservationCopy } = await import('@/lib/email/sendReservationCopy');
        const summary = buildReservationCopySummary(pre as any, nextSlots);
        // Formatear fechas si están en ISO para el summary (sobrescribimos display sin alterar slots reales)
        if (summary.checkIn && /\d{4}-\d{2}-\d{2}/.test(summary.checkIn)) summary.checkIn = toDDMMYYYY(summary.checkIn);
        if (summary.checkOut && /\d{4}-\d{2}-\d{2}/.test(summary.checkOut)) summary.checkOut = toDDMMYYYY(summary.checkOut);
        let attempt = 0; let sent = false; let lastErr: any;
        while (attempt < 2 && !sent) {
            try {
                await sendReservationCopy({ hotelId: pre.msg.hotelId, to: detection.emailAddress!, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
                sent = true;
            } catch (err) {
                lastErr = err; attempt++;
                if (attempt < 2) await new Promise(r => setTimeout(r, 150));
            }
        }
        if (sent) {
            const ok = lang === 'es'
                ? `Listo, te envié una copia por email a ${detection.emailAddress}.`
                : lang === 'pt'
                    ? `Pronto, enviei uma cópia por e-mail para ${detection.emailAddress}.`
                    : `Done, I sent a copy by email to ${detection.emailAddress}.`;
            return { handled: true, finalText: ok, nextCategory: 'send_email_copy', nextSlots, needsSupervision: false };
        }
        const rawMsg = (lastErr as any)?.message || String(lastErr);
        const isNotConfigured = /not configured|smtpHost/i.test(rawMsg);
        console.warn('[quickIntents][email] fail after retry:', rawMsg, { isNotConfigured });
        const failNoCfg = lang === 'es'
            ? 'Aún no tengo el correo configurado en este hotel. ¿Querés dar otro email o lo derivo a recepción?'
            : lang === 'pt'
                ? 'Ainda não tenho o e-mail configurado neste hotel. Quer informar outro e-mail ou encaminho à recepção?'
                : 'Email sending is not configured. Would you like to provide another address or escalate to reception?';
        const failTemp = lang === 'es'
            ? 'No pude enviarlo ahora. ¿Querés que lo intente de nuevo o lo derivo a recepción?'
            : lang === 'pt'
                ? 'Não consegui enviar agora. Quer que eu tente novamente ou encaminho à recepção?'
                : "I couldn't send it now. Should I retry or escalate to reception?";
        return {
            handled: true,
            finalText: isNotConfigured ? failNoCfg : failTemp,
            nextCategory: 'send_email_copy',
            nextSlots,
            needsSupervision: false // mantenemos en automático hasta que el usuario decida
        };
    }

    // WhatsApp flows
    if (detection.kind === 'whatsapp') {
        // Derivar JID de contexto si no se proporcionó número (solo en strict/light con reserva previa). Followup siempre tiene phoneDigits.
        let jid: string | undefined;
        if (detection.phoneDigits) {
            jid = `${detection.phoneDigits.replace(/\D/g, '')}@s.whatsapp.net`;
        } else {
            const jidFromGuest = (pre.msg.guestId || '').includes('@s.whatsapp.net') ? pre.msg.guestId : undefined;
            const jidFromConv = (pre.conversationId || '').split('whatsapp-')[1];
            jid = jidFromGuest || (jidFromConv && /@s\.whatsapp\.net$/.test(jidFromConv) ? jidFromConv : undefined);
        }
        if (!jid) {
            // Pedir número si no lo tenemos
            const ask = lang === 'es'
                ? '¿A qué número de WhatsApp te la envío? (solo dígitos con código de país)'
                : lang === 'pt'
                    ? 'Para qual número do WhatsApp devo enviar? (somente dígitos com código do país)'
                    : 'Which WhatsApp number should I send it to? (digits with country code)';
            return { handled: true, finalText: ask, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision: false };
        }
        try {
            const { sendReservationCopyWA } = await import('@/lib/whatsapp/sendReservationCopyWA');
            const { isWhatsAppReady } = await import('@/lib/adapters/whatsappBaileysAdapter');
            const { publishSendReservationCopy } = await import('@/lib/whatsapp/dispatch');
            const summary = buildReservationCopySummary(pre as any, nextSlots);
            if (isWhatsAppReady()) {
                await sendReservationCopyWA({ hotelId: pre.msg.hotelId, toJid: jid, summary, conversationId: pre.conversationId, channel: pre.msg.channel });
            } else {
                const { published, requestId } = await publishSendReservationCopy({ hotelId: pre.msg.hotelId, toJid: jid, conversationId: pre.conversationId, channel: pre.msg.channel, summary });
                if (!published) throw Object.assign(new Error('Remote dispatch publish failed'), { code: 'WA_REMOTE_DISPATCH_FAILED' });
                if (requestId) {
                    const { redis } = await import('@/lib/services/redis');
                    const started = Date.now();
                    while (Date.now() - started < 1200) {
                        const ack = await redis.get(`wa:ack:${requestId}`);
                        if (ack) break;
                        await new Promise(r => setTimeout(r, 120));
                    }
                }
            }
            const display = detection.phoneDigits ? (detection.phoneDigits.startsWith('+') ? detection.phoneDigits : `+${detection.phoneDigits}`) : '';
            // Wording contextual: strict / followup => "copia" (o copy / cópia), light => "reserva" / booking
            const useCopy = detection.mode !== 'light';
            const nounEs = useCopy ? 'una copia' : 'la reserva';
            const nounPt = useCopy ? 'uma cópia' : 'a reserva';
            const nounEn = useCopy ? 'a copy' : 'the booking';
            const ok = lang === 'es'
                ? `Listo, te envié ${nounEs} por WhatsApp${display ? ' al ' + display : ''}.`
                : lang === 'pt'
                    ? `Pronto, enviei ${nounPt} pelo WhatsApp${display ? ' para ' + display : ''}.`
                    : `Done, I sent ${nounEn} via WhatsApp${display ? ' to ' + display : ''}.`;
            return { handled: true, finalText: ok, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision: false };
        } catch (e) {
            const code = (e as any)?.code;
            console.warn('[quickIntents][whatsapp] error:', (e as any)?.message || e, code ? { code } : '');
            const fail = lang === 'es'
                ? (code === 'WA_NOT_READY' ? 'Aún estoy inicializando WhatsApp. Probá de nuevo en unos segundos.' : 'No pude enviar por WhatsApp ahora. Un recepcionista te contactará.')
                : lang === 'pt'
                    ? (code === 'WA_NOT_READY' ? 'Ainda estou inicializando o WhatsApp. Tente novamente em alguns segundos.' : 'Não consegui enviar pelo WhatsApp agora. Um recepcionista vai te contatar.')
                    : (code === 'WA_NOT_READY' ? 'WhatsApp is still initializing. Please try again in a few seconds.' : "I couldn't send via WhatsApp now. A receptionist will reach out.");
            const needsSupervision = code !== 'WA_NOT_READY';
            return { handled: true, finalText: fail, nextCategory: 'send_whatsapp_copy', nextSlots, needsSupervision };
        }
    }
    return null;
}
