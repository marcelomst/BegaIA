import { NextRequest, NextResponse } from 'next/server';
import { getHotelConfig } from '@/lib/config/hotelConfig.server';
import { resolveEmailCredentials } from '@/lib/email/resolveEmailCredentials';
import imaps from 'imap-simple';
import nodemailer from 'nodemailer';
import { classifyEmailError } from '@/lib/email/classifyEmailError';

export const dynamic = 'force-dynamic';

async function testImap(user: string, pass: string, host: string, port: number, secure: boolean) {
    const start = Date.now();
    try {
        const conn = await imaps.connect({
            imap: { user, password: pass, host, port, tls: true, tlsOptions: { rejectUnauthorized: false }, authTimeout: 6000 }
        });
        await conn.openBox('INBOX');
        await conn.end();
        return { ok: true, ms: Date.now() - start };
    } catch (e: any) {
        return { ok: false, ms: Date.now() - start, error: e?.message || String(e), textCode: e?.textCode };
    }
}

async function testSmtp(user: string, pass: string, host: string, port: number, secure: boolean) {
    const start = Date.now();
    try {
        const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
        await transporter.verify();
        return { ok: true, ms: Date.now() - start };
    } catch (e: any) {
        return { ok: false, ms: Date.now() - start, error: e?.message || String(e), code: e?.code };
    }
}

export async function GET(req: NextRequest) {
    const hotelId = req.nextUrl.searchParams.get('hotelId');
    if (!hotelId) return NextResponse.json({ ok: false, error: 'hotelId required' }, { status: 400 });
    const hotel = await getHotelConfig(hotelId);
    if (!hotel) return NextResponse.json({ ok: false, error: 'hotel not found' }, { status: 404 });
    const email: any = hotel.channelConfigs?.email;
    if (!email) return NextResponse.json({ ok: false, error: 'email channel not configured' }, { status: 400 });

    const creds = resolveEmailCredentials(email);
    if (!creds || !creds.pass || creds.source === 'none') {
        return NextResponse.json({ ok: false, stage: 'resolve', error: 'credentials missing', meta: { source: creds?.source, reason: creds?.reason } }, { status: 400 });
    }

    const imapResult = await testImap(creds.user, creds.pass, email.imapHost, email.imapPort || 993, true);
    const smtpResult = await testSmtp(creds.user, creds.pass, email.smtpHost, email.smtpPort || 587, email.secure || false);

    const errors: string[] = [];
    if (!imapResult.ok) errors.push('IMAP:' + imapResult.error);
    if (!smtpResult.ok) errors.push('SMTP:' + smtpResult.error);
    const classifications = errors.map(e => ({ raw: e, c: classifyEmailError(e) }));

    return NextResponse.json({
        ok: imapResult.ok && smtpResult.ok,
        hotelId,
        user: creds.user,
        secretRef: email.secretRef || null,
        source: creds.source,
        imap: imapResult,
        smtp: smtpResult,
        errors: errors.length ? errors : null,
        classifications: classifications.length ? classifications : null,
    }, { status: (imapResult.ok && smtpResult.ok) ? 200 : 207 });
}
