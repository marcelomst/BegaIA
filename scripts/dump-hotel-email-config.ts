// scripts/dump-hotel-email-config.ts
// Muestra la configuración de email de un hotel directamente desde Astra.
import * as dotenv from 'dotenv';
import { getHotelConfig } from '../lib/config/hotelConfig.server';
import { emailSecretEnvVarName } from '../lib/email/resolveEmailCredentials';

dotenv.config();

async function main() {
    const hotelId = process.env.HOTEL_ID || process.argv[2];
    if (!hotelId) {
        console.error('Uso: HOTEL_ID=<id> pnpm exec tsx scripts/dump-hotel-email-config.ts');
        process.exit(1);
    }
    const cfg = await getHotelConfig(hotelId);
    if (!cfg) {
        console.error('No existe hotel', hotelId);
        process.exit(1);
    }
    const email = (cfg.channelConfigs as any)?.email;
    if (!email) {
        console.error('Hotel sin channelConfigs.email');
        process.exit(1);
    }
    const secretRef = email.secretRef;
    const expectedVar = secretRef ? emailSecretEnvVarName(secretRef) : null;
    console.log(JSON.stringify({
        hotelId: cfg.hotelId,
        dirEmail: email.dirEmail,
        secretRef,
        expectedVar,
        inlinePasswordPresent: !!email.password,
        imapHost: email.imapHost,
        imapPort: email.imapPort,
        smtpHost: email.smtpHost,
        smtpPort: email.smtpPort,
        secure: email.secure,
        credentialsStrategy: email.credentialsStrategy,
    }, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
