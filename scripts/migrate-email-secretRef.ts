#!/usr/bin/env tsx
/**
 * Script: migrate-email-secretRef.ts
 * Asigna secretRef a hoteles que no lo tengan y opcionalmente fija credentialsStrategy.
 * Convención: secretRef = `${hotelId}-main` si no existe.
 */
import { getAllHotelConfigs, updateHotelConfig } from '../lib/config/hotelConfig.server';

async function run() {
    const hotels = await getAllHotelConfigs();
    let updated = 0;
    for (const h of hotels) {
        const email: any = h.channelConfigs?.email;
        if (!email) continue;
        if (!email.secretRef) {
            email.secretRef = `${h.hotelId}-main`;
            if (!email.password) email.credentialsStrategy = 'ref';
            await updateHotelConfig(h.hotelId, { channelConfigs: { ...h.channelConfigs, email } });
            console.log(`[migrate-secretRef] hotel=${h.hotelId} secretRef=${email.secretRef}`);
            updated++;
        }
    }
    console.log(`Done. Updated ${updated} hotels.`);
}
run().catch(e => { console.error(e); process.exit(1); });
