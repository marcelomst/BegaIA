import { describe, it, expect } from 'vitest';
import { classifyEmailError } from '@/lib/email/classifyEmailError';

describe('classifyEmailError', () => {
    it('detecta configuración faltante', () => {
        const c = classifyEmailError('SMTPHost not configured for hotel');
        expect(c.type).toBe('config');
        expect(c.isNotConfigured).toBe(true);
    });
    it('detecta quota gmail', () => {
        const c = classifyEmailError('550-5.4.5 Daily user sending limit exceeded.');
        expect(c.type).toBe('quota');
        expect(c.isQuota).toBe(true);
    });
    it('marca como transient cualquier otro', () => {
        const c = classifyEmailError('ECONNRESET socket hang up');
        expect(c.type).toBe('transient');
    });
});
