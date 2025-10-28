#!/usr/bin/env tsx
/**
 * Elimina password inline cuando secretRef + env var funcionan.
 */
import { getAllHotelConfigs, updateHotelConfig } from '../lib/config/hotelConfig.server';
import { resolveEmailCredentials } from '../lib/email/resolveEmailCredentials';

async function run() {
    const hotels = await getAllHotelConfigs();
    let cleaned = 0;
    for (const h of hotels) {
        const email: any = h.channelConfigs?.email;
        if (!email) continue;
        if (!email.secretRef || !email.password) continue;
        const creds = resolveEmailCredentials(email);
        if (creds?.source === 'env') {
            const clone = { ...h.channelConfigs.email };
            delete clone.password;
            await updateHotelConfig(h.hotelId, { channelConfigs: { ...h.channelConfigs, email: clone } });
            console.log(`[cleanup-inline] removed legacy password hotel=${h.hotelId}`);
            cleaned++;
        }
    }
    console.log(`Done. Cleaned ${cleaned} hotels.`);
}
run().catch(e => { console.error(e); process.exit(1); });
