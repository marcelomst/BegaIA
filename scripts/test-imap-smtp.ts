// scripts/test-imap-smtp.ts
// Script de diagnóstico para validar conectividad IMAP y SMTP con las credenciales actuales.
// Uso:
//   SECRET_REF=<ref> pnpm exec tsx scripts/test-imap-smtp.ts
// o especificar directamente variables:
//   EMAIL_USER=xxx EMAIL_IMAP_HOST=imap.gmail.com EMAIL_SMTP_HOST=smtp.gmail.com EMAIL_PASS=yyy pnpm exec tsx scripts/test-imap-smtp.ts

import * as nodemailer from 'nodemailer';
import * as imaps from 'imap-simple';
import * as dotenv from 'dotenv';
import { emailSecretEnvVarName } from '../lib/email/resolveEmailCredentials';

dotenv.config();

async function main() {
    const secretRef = process.env.SECRET_REF;
    let pass = process.env.EMAIL_PASS;
    if (!pass && secretRef) {
        const varName = emailSecretEnvVarName(secretRef);
        pass = process.env[varName];
        console.log(`[diag] Usando secretRef=${secretRef} -> var ${varName}, pass presente=${!!pass}`);
    }
    if (!pass) {
        console.warn('[diag] No se encontró password (EMAIL_PASS o secretRef).');
    }

    const user = process.env.EMAIL_USER || process.env.DIR_EMAIL;
    const imapHost = process.env.EMAIL_IMAP_HOST || 'imap.gmail.com';
    const smtpHost = process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com';
    const imapPort = Number(process.env.EMAIL_IMAP_PORT || 993);
    const smtpPort = Number(process.env.EMAIL_SMTP_PORT || 587);
    const secure = process.env.EMAIL_SECURE === 'true' || smtpPort === 465;

    console.log('[diag] Parametros:', { user, imapHost, imapPort, smtpHost, smtpPort, secure, hasPass: !!pass });
    if (!user || !pass) {
        console.error('[diag] Faltan credenciales básicas user/pass. Abort.');
        process.exit(1);
    }

    // IMAP
    try {
        console.log('[diag][IMAP] Conectando...');
        const conn = await imaps.connect({
            imap: {
                user,
                password: pass,
                host: imapHost,
                port: imapPort,
                tls: true,
                tlsOptions: { rejectUnauthorized: false },
                authTimeout: 7000,
            },
        });
        await conn.openBox('INBOX');
        console.log('[diag][IMAP] ✅ Conexión exitosa y INBOX abierta.');
        await conn.end();
    } catch (e: any) {
        console.error('[diag][IMAP] ❌ Error', { code: e?.code, message: e?.message });
    }

    // SMTP
    try {
        console.log('[diag][SMTP] Conectando (verify)...');
        const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure,
            auth: { user, pass },
        });
        await transporter.verify();
        console.log('[diag][SMTP] ✅ Verificación exitosa.');
    } catch (e: any) {
        console.error('[diag][SMTP] ❌ Error', { code: e?.code, message: e?.message });
    }
}

main().catch(err => {
    console.error('[diag] Error fatal', err);
    process.exit(1);
});
