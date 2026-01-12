// Path: /root/begasist/test/unit/inputNormalizerAgent.basic.test.ts
import { describe, it, expect } from 'vitest';
import { runInputNormalizer } from '@/lib/agents/inputNormalizerAgent';

const baseMsg = {
    messageId: 'm-1',
    hotelId: 'hotel999',
    channel: 'web',
    sender: 'Usuario',
    content: 'Hola necesito una habitación para 2 huéspedes del 02/10/2025 al 04/10/2025',
    suggestion: '',
    status: 'received',
    timestamp: new Date().toISOString(),
    role: 'user',
    detectedLanguage: 'es'
} as any;

describe('runInputNormalizer (mínimo)', () => {
    it('produce NormalizedContext con lang y currSlots básicos', async () => {
        const norm = await runInputNormalizer({ msg: baseMsg });
        expect(norm.lang).toBe('es');
        expect(norm.conversationId).toBeTruthy();
        expect(norm.currSlots).toBeTypeOf('object');
        // No garantizamos parsing completo aquí, solo existencia.
        expect(norm.prevCategory).toBeNull();
        expect(norm.prevSlotsStrict).toBeTypeOf('object');
        expect(Array.isArray(norm.lcHistory)).toBe(true);
    });

    it('fallback a es si detectedLanguage desconocido', async () => {
        const msg2 = { ...baseMsg, detectedLanguage: 'xx' };
        const norm2 = await runInputNormalizer({ msg: msg2 });
        expect(norm2.lang).toBe('es');
    });

    it('fusiona prevSlotsStrict con turnSlots dando prioridad al turno', async () => {
        const prevSlotsStrict = {
            guestName: 'Marcelo Martinez',
            roomType: 'double',
            checkIn: '2025-10-02',
            checkOut: '2025-10-04',
            numGuests: '1'
        };
        const msg = { ...baseMsg, content: 'somos 2 huéspedes para el 02/10/2025 al 04/10/2025' };
        const norm = await runInputNormalizer({ msg, prevSlotsStrict });
        // Debe mantener los campos previos y sobrescribir numGuests con el turno
        expect(norm.prevSlotsStrict.numGuests).toBe('1');
        expect(norm.currSlots.numGuests).toBe('2');
        expect(norm.currSlots.roomType).toBe('double');
    });

    it('incluye stateForPlaybook con locale y draft cuando hay datos', async () => {
        const msg = { ...baseMsg, content: 'necesito 2 huéspedes del 02/10/2025 al 04/10/2025' };
        const norm = await runInputNormalizer({ msg });
        expect(norm.stateForPlaybook).toBeDefined();
        expect(norm.stateForPlaybook?.locale).toBe(norm.lang);
        // Draft presente cuando hay slots inferidos del turno
        expect(!!norm.stateForPlaybook?.draft).toBe(true);
    });
});
