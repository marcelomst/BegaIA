import { NextRequest, NextResponse } from 'next/server';
import { getAllHotelConfigs } from '@/lib/config/hotelConfig.server';
import { resolveEmailCredentials } from '@/lib/email/resolveEmailCredentials';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
    const hotels = await getAllHotelConfigs();
    const data = hotels.map(h => {
        const email: any = h.channelConfigs?.email;
        if (!email) return { hotelId: h.hotelId, hasEmail: false };
        const creds = resolveEmailCredentials(email);
        return {
            hotelId: h.hotelId,
            hasEmail: true,
            secretRef: email.secretRef || null,
            strategy: email.credentialsStrategy || null,
            source: creds?.source || 'none',
            unresolved: creds?.source === 'none',
            fallbackInline: creds?.source === 'inline' && !!email.password,
        };
    });
    return NextResponse.json({ ok: true, hotels: data });
}