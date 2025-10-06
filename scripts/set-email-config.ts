// scripts/set-email-config.ts
// Configura/actualiza credenciales SMTP para el canal email de un hotel.
// Uso rápido:
//   pnpm tsx scripts/set-email-config.ts --hotel=hotel999 \
//     --smtpHost=smtp.example.com --smtpPort=587 --secure=false \
//     --dirEmail=bot@example.com --password=********
// Opcional: --mode=automatic|supervised (default: automatic), --enabled=true|false (default: true)

import { updateHotelConfig, getHotelConfig } from "../lib/config/hotelConfig.server";

type Args = Record<string, string>;

function parseArgs(): Args {
    const out: Args = {};
    for (const arg of process.argv.slice(2)) {
        const m = arg.match(/^--([^=]+)=(.*)$/);
        if (m) out[m[1]] = m[2];
    }
    return out;
}

async function main() {
    const a = parseArgs();
    const hotelId = a.hotel || process.env.HOTEL_ID || "hotel999";
    const enabled = (a.enabled ?? "true").toLowerCase() !== "false";
    const mode = (a.mode as any) || (process.env.EMAIL_MODE as any) || "automatic";

    const smtpHost = a.smtpHost || process.env.SMTP_HOST;
    const smtpPortStr = a.smtpPort || process.env.SMTP_PORT || "587";
    const secureStr = a.secure || process.env.SMTP_SECURE || "false";
    const dirEmail = a.dirEmail || process.env.SMTP_USER || process.env.DIR_EMAIL;
    const password = a.password || process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
    const imapHost = a.imapHost || process.env.IMAP_HOST || "";
    const imapPortStr = a.imapPort || process.env.IMAP_PORT || "993";

    if (!smtpHost || !dirEmail || !password) {
        console.error("\n❌ Faltan parámetros obligatorios: --smtpHost, --dirEmail y --password (o variables de entorno equivalentes).\n");
        console.error("Ejemplo:");
        console.error("  pnpm tsx scripts/set-email-config.ts --hotel=hotel999 --smtpHost=smtp.mailtrap.io --smtpPort=587 --secure=false --dirEmail=bot@example.com --password=********\n");
        process.exit(1);
    }

    const smtpPort = Number(smtpPortStr);
    const imapPort = Number(imapPortStr);
    const secure = ["1", "true", "yes"].includes(secureStr.toLowerCase());

    const prev = await getHotelConfig(hotelId);
    if (!prev) {
        console.warn(`⚠️ No existe config para ${hotelId}. Se creará/actualizará igualmente.`);
    } else {
        console.log(`ℹ️ Config actual encontrada para ${hotelId}: ${prev.hotelName}`);
    }

    const updated = await updateHotelConfig(hotelId, {
        channelConfigs: {
            ...(prev?.channelConfigs || {}),
            email: {
                enabled,
                mode,
                dirEmail,
                password,
                imapHost,
                imapPort,
                smtpHost,
                smtpPort,
                secure,
                // flags opcionales
                preferredCurationModel: (prev as any)?.channelConfigs?.email?.preferredCurationModel || "gpt-4o",
            },
        } as any,
    });

    console.log("\n✅ Canal email actualizado para", hotelId);
    console.log({
        enabled,
        mode,
        dirEmail,
        smtpHost,
        smtpPort,
        secure,
        imapHost,
        imapPort,
    });
}

main().catch((err) => {
    console.error("❌ Error:", err?.message || err);
    process.exit(1);
});
