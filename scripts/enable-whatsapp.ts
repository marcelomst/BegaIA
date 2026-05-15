#!/usr/bin/env tsx
/**
 * Habilita el canal WhatsApp para un hotel (o ajusta celNumber) en Astra.
 * Uso:
 *   pnpm tsx scripts/enable-whatsapp.ts --hotel hotel999 --number 59891359375 --ignore-groups true
 */
import { getHotelConfig, updateHotelConfig } from "../lib/config/hotelConfig.server";

interface Args { hotel?: string; number?: string; ignoreGroups?: boolean; }
function parseArgs(): Args {
    const out: Args = {};
    for (let i = 2; i < process.argv.length; i++) {
        const a = process.argv[i];
        if (a === "--hotel" || a === "-h") out.hotel = process.argv[++i];
        else if (a === "--number" || a === "-n") out.number = process.argv[++i];
        else if (a === "--ignore-groups") out.ignoreGroups = process.argv[++i] !== "false";
    }
    return out;
}

async function main() {
    const { hotel = process.env.HOTEL_ID, number, ignoreGroups = true } = parseArgs();
    if (!hotel) {
        console.error("Falta --hotel o HOTEL_ID en env");
        process.exit(1);
    }
    const cfg = await getHotelConfig(hotel).catch(() => null);
    if (!cfg) {
        console.error("No existe config de hotel:", hotel);
        process.exit(1);
    }
    const prev = cfg.channelConfigs?.whatsapp || {};
    const updates: any = {
        channelConfigs: {
            ...cfg.channelConfigs,
            whatsapp: { ...prev, enabled: true, ignoreGroups },
        },
    };
    if (number) updates.channelConfigs.whatsapp.celNumber = number.startsWith("+") ? number.slice(1) : number;
    await updateHotelConfig(hotel, updates);
    console.log("✅ Canal WhatsApp habilitado", {
        hotel,
        enabled: Boolean(updates.channelConfigs.whatsapp.enabled),
        ignoreGroups: Boolean(updates.channelConfigs.whatsapp.ignoreGroups),
        hasCelNumber: Boolean(updates.channelConfigs.whatsapp.celNumber),
    });
}
main();
