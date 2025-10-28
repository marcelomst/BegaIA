import { describe, it, expect } from 'vitest';
import { resolveEmailCredentials } from '@/lib/email/resolveEmailCredentials';

describe('resolveEmailCredentials', () => {
    const base = {
        enabled: true,
        mode: 'supervised' as const,
        dirEmail: 'noreply@example.com',
        smtpHost: 'smtp.example.com',
        smtpPort: 587,
        imapHost: 'imap.example.com',
        imapPort: 993,
    };

    it('uses env when secretRef present and var defined', () => {
        process.env.EMAIL_PASS__H1_MAIN = 'secret-env-pass';
        const creds = resolveEmailCredentials({ ...base, secretRef: 'h1-main' } as any);
        expect(creds?.source).toBe('env');
        expect(creds?.pass).toBe('secret-env-pass');
    });

    it('falls back to inline when secretRef var missing', () => {
        delete process.env.EMAIL_PASS__H2_MAIN;
        const creds = resolveEmailCredentials({ ...base, secretRef: 'h2-main', password: 'inline-pass' } as any);
        expect(creds?.source).toBe('inline');
        expect(creds?.pass).toBe('inline-pass');
    });

    it('returns none when neither secretRef env nor password', () => {
        delete process.env.EMAIL_PASS__H3_MAIN;
        const creds = resolveEmailCredentials({ ...base, secretRef: 'h3-main' } as any);
        expect(creds?.source).toBe('none');
        expect(creds?.reason).toMatch(/No se encontró variable/i);
    });

    it('uses inline when only password (legacy)', () => {
        const creds = resolveEmailCredentials({ ...base, password: 'legacy' } as any);
        expect(creds?.source).toBe('inline');
        expect(creds?.pass).toBe('legacy');
    });
});
