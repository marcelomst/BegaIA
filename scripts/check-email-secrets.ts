#!/usr/bin/env tsx
/**
 * Script: check-email-secrets.ts
 * Lista hoteles con email.secretRef y verifica existencia de la variable de entorno.
 */
import { getAllHotelConfigs } from '../lib/config/hotelConfig.server';
import { resolveEmailCredentials } from '../lib/email/resolveEmailCredentials';

async function run() {
    const hotels = await getAllHotelConfigs();
    const rows = hotels.map(h => {
        const email: any = h.channelConfigs?.email;
        if (!email) return { hotelId: h.hotelId, secretRef: null, status: 'no-email-channel' };
        if (!email.secretRef && !email.password) return { hotelId: h.hotelId, secretRef: null, status: 'missing-secretRef-and-password' };
        if (!email.secretRef && email.password) return { hotelId: h.hotelId, secretRef: null, status: 'legacy-inline' };
        const creds = resolveEmailCredentials(email);
        return {
            hotelId: h.hotelId,
            secretRef: email.secretRef || null,
            strategy: email.credentialsStrategy,
            status: creds?.source === 'env' ? 'env-ok' : creds?.source === 'inline' ? 'fallback-inline' : 'unresolved'
        };
    });

    // Resumen
    const agg = rows.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>);

    console.table(rows);
    console.log('\nSummary:', agg);
}
run().catch(e => { console.error(e); process.exit(1); });
