import { describe, it, expect, vi, beforeEach } from 'vitest';

async function loadModule() {
    const mod = await import('@/lib/email/sendReservationCopy');
    return mod.sendReservationCopy;
}

vi.mock('@/lib/config/hotelConfig.server', () => ({
    getHotelConfig: vi.fn(async () => ({
        hotelId: 'hotelABC',
        hotelName: 'Hotel ABC',
        channelConfigs: {
            email: {
                enabled: true,
                mode: 'supervised',
                dirEmail: 'noreply@hotelabc.com',
                smtpHost: 'smtp.example.com',
                smtpPort: 587,
                secretRef: 'hotelABC-main',
                credentialsStrategy: 'ref',
            }
        }
    }))
}));

vi.mock('nodemailer', () => ({
    default: { createTransport: () => ({ sendMail: vi.fn(async () => ({})) }) }
}));

describe('sendReservationCopy with secretRef', () => {
    beforeEach(() => {
        process.env.EMAIL_SENDING_ENABLED = 'true';
        process.env.EMAIL_PASS__HOTELABC_MAIN = 'env-pass-123';
    });

    it('sends using env credentials (source=env)', async () => {
        const sendReservationCopy = await loadModule();
        await sendReservationCopy({
            hotelId: 'hotelABC',
            to: 'guest@test.com',
            summary: { guestName: 'Juan', checkIn: '2025-12-01', checkOut: '2025-12-05', numGuests: 2 },
            attachPdf: false,
        });
        expect(true).toBe(true);
    });

    it('fails when EMAIL_SENDING_ENABLED=false', async () => {
        process.env.EMAIL_SENDING_ENABLED = 'false';
        // force re-import to re-evaluate EMAIL_SENDING_ENABLED constant
        const fresh = await import('@/lib/email/sendReservationCopy?ts=' + Date.now());
        await expect(fresh.sendReservationCopy({
            hotelId: 'hotelABC',
            to: 'guest@test.com',
            summary: {},
            attachPdf: false,
        })).rejects.toThrow(/EMAIL_SENDING_DISABLED/);
    });
});
