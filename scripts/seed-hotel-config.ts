// Path: /root/begasist/scripts/seed-hotel-config.ts
/**
 * Semilla mínima de configuración de hotel.
 * Crea o actualiza (upsert) la configuración para un hotel dado.
 * Uso:
 *   pnpm exec tsx scripts/seed-hotel-config.ts --hotel hotel999        (dry-run)
 *   pnpm exec tsx scripts/seed-hotel-config.ts --hotel hotel999 --apply (aplica cambios)
 * Flags:
 *   --with-demo-users    Agrega un usuario demo básico
 *   --timezone America/Montevideo  (override timezone)
 *   --lang es|en|pt      (defaultLanguage)
 */
import 'dotenv/config';
import { getHotelConfig, updateHotelConfig, createHotelConfig } from '../lib/config/hotelConfig.server';

type Args = { hotel: string; apply: boolean; addUsers: boolean; timezone?: string; lang?: string };
function parseArgs(): Args {
    const a = process.argv.slice(2);
    let hotel = process.env.HOTEL_ID || 'hotel999';
    let apply = false;
    let addUsers = false;
    let timezone: string | undefined;
    let lang: string | undefined;
    for (let i = 0; i < a.length; i++) {
        const x = a[i];
        if (x === '--hotel' && a[i + 1]) { hotel = a[++i]; continue; }
        if (x === '--apply') { apply = true; continue; }
        if (x === '--with-demo-users') { addUsers = true; continue; }
        if (x === '--timezone' && a[i + 1]) { timezone = a[++i]; continue; }
        if (x === '--lang' && a[i + 1]) { lang = a[++i]; continue; }
    }
    return { hotel, apply, addUsers, timezone, lang };
}

async function ensureHotelConfig(args: Args) {
    const existing = await getHotelConfig(args.hotel);
    if (!args.apply) {
        if (existing) {
            console.log(`[seed-config] DRY-RUN: ya existe config para ${args.hotel}. hotelName=${existing.hotelName}`);
        } else {
            console.log(`[seed-config] DRY-RUN: no existe config; se crearía nueva con valores por defecto.`);
        }
        return existing;
    }

    if (!existing) {
        const base = {
            hotelId: args.hotel,
            hotelName: `Demo ${args.hotel}`,
            defaultLanguage: (['es', 'en', 'pt'] as const).includes(args.lang as any) ? (args.lang as any) : 'es',
            timezone: args.timezone || 'UTC',
            channelConfigs: {},
            users: args.addUsers ? [{ email: `admin@${args.hotel}.example`, role: 'admin' }] : [],
            country: 'UY',
            city: 'Montevideo',
            address: 'Calle Demo 123',
            phone: '+59800000000'
        } as const;
        const created = await createHotelConfig(base as any);
        console.log(`[seed-config] ✅ Creada nueva config para ${args.hotel}`);
        return created;
    }
    // Existe: aplicar merge mínimo (solo timezone/lang si se dieron overrides)
    const overrides: any = {};
    if (args.timezone) overrides.timezone = args.timezone;
    if (args.lang && ['es', 'en', 'pt'].includes(args.lang)) overrides.defaultLanguage = args.lang;
    if (args.addUsers && existing.users.length === 0) overrides.users = [{ email: `admin@${args.hotel}.example`, role: 'admin' }];
    if (Object.keys(overrides).length === 0) {
        console.log(`[seed-config] Config existente sin cambios (no hay overrides)`);
        return existing;
    }
    const updated = await updateHotelConfig(args.hotel, overrides);
    console.log(`[seed-config] ✅ Actualizada config existente para ${args.hotel}`);
    return updated;
}

async function main() {
    const args = parseArgs();
    console.log(`[seed-config] hotelId=${args.hotel} mode=${args.apply ? 'APPLY' : 'DRY-RUN'}`);
    const cfg = await ensureHotelConfig(args);
    console.log(`[seed-config] Resultado hotelName=${cfg?.hotelName} defaultLanguage=${cfg?.defaultLanguage} timezone=${cfg?.timezone}`);
}

main().catch(e => { console.error('[seed-config] ❌ Error:', e); process.exit(1); });
