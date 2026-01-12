import { describe, it, expect } from 'vitest';
import { generateKbFilesFromProfile, type Profile } from '@/lib/kb/generator';

// Focus: amenities normalization + localization (canonical slugs, schedules normalization)
// This ensures mixed "other" synonyms become canonical slugs and schedules keyed by localized names are normalized.

describe('generateKbFilesFromProfile amenities normalization', () => {
    it('normalizes other amenity synonyms to canonical slugs, localizes output once, and normalizes schedule keys', () => {
        const profile: Profile = {
            hotelId: 'hotel999',
            hotelName: 'Hotel Demo',
            defaultLanguage: 'es',
            amenities: {
                // Provide canonical slugs directly in tags
                tags: ['pool', 'gym', 'cafe'],
                // Provide synonyms in other[] which must be normalized to slugs
                other: ['Jacuzzi', 'Recepción 24h', 'Wi‑Fi gratis'],
                schedules: {
                    // Keys intentionally in localized / synonym form to test normalization
                    'Piscina': '08:00 - 20:00',
                    'Gimnasio': '06:00 - 22:00',
                    'Jacuzzi': '10:00 - 18:00'
                },
                notes: 'Acceso controlado con pulsera.',
                parkingNotes: 'Cocheras cubiertas limitadas.'
            },
            policies: { pets: 'Permitidas hasta 10kg (cargo extra).', cancellation: {} },
            schedules: { breakfast: '07:00 - 10:30' },
        } as any;

        const files = generateKbFilesFromProfile(profile);
        const body = files['amenities/amenities_list.es.txt'];
        expect(body).toBeTruthy();

        // 1. Tags line should include localized labels for ALL canonical slugs (order preserved from input sequence + normalized others)
        // Expected order: pool, gym, cafe, hot_tub, reception_24h, free_wifi
        expect(body).toMatch(/- Tags: Piscina, Gimnasio, Cafetería, Hidromasaje, Recepción 24h, Wi‑Fi gratis/);

        // 2. Schedules section should show localized labels, not raw synonyms; each provided schedule appears once
        expect(body).toMatch(/## Horarios/);
        expect(body).toMatch(/- Piscina: 08:00 - 20:00/);
        expect(body).toMatch(/- Gimnasio: 06:00 - 22:00/);
        expect(body).toMatch(/- Hidromasaje: 10:00 - 18:00/);

        // 3. Notes preserved
        expect(body).toMatch(/Estacionamiento notas: Cocheras cubiertas limitadas\./);
        expect(body).toMatch(/- Notas: Acceso controlado con pulsera\./);

        // 4. Pets + Breakfast schedule lines present
        expect(body).toMatch(/- Desayuno: 07:00 - 10:30/);
        expect(body).toMatch(/- Mascotas: Permitidas hasta 10kg/);
    });
});
