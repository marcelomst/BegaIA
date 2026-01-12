// lib/taxonomy/amenities.ts
// Canonical amenities taxonomy: slugs stored internally, localized labels on output.

export type Lang = 'es' | 'en' | 'pt';

export type AmenityTaxon = {
    slug: string; // canonical id, lowercase snake_case
    i18n: Record<Lang, string>;
    synonyms: string[]; // lowercased variants users may type
};

export const AMENITIES_TAXONOMY: AmenityTaxon[] = [
    { slug: 'pool', i18n: { es: 'Piscina', en: 'Pool', pt: 'Piscina' }, synonyms: ['piscina', 'pileta', 'pool'] },
    { slug: 'gym', i18n: { es: 'Gimnasio', en: 'Gym', pt: 'Academia' }, synonyms: ['gimnasio', 'gym', 'academia'] },
    { slug: 'spa', i18n: { es: 'Spa', en: 'Spa', pt: 'Spa' }, synonyms: ['spa'] },
    { slug: 'parking', i18n: { es: 'Estacionamiento', en: 'Parking', pt: 'Estacionamento' }, synonyms: ['estacionamiento', 'cochera', 'parking'] },
    { slug: 'restaurant', i18n: { es: 'Restaurante', en: 'Restaurant', pt: 'Restaurante' }, synonyms: ['restaurante', 'restaurant'] },
    { slug: 'bar', i18n: { es: 'Bar', en: 'Bar', pt: 'Bar' }, synonyms: ['bar'] },
    { slug: 'cafe', i18n: { es: 'Cafetería', en: 'Cafe', pt: 'Cafeteria' }, synonyms: ['cafeteria', 'cafetería', 'cafe'] },
    { slug: 'room_service', i18n: { es: 'Room service', en: 'Room service', pt: 'Serviço de quarto' }, synonyms: ['room service', 'servicio a la habitación', 'servicio de quarto'] },
    { slug: 'reception_24h', i18n: { es: 'Recepción 24h', en: '24h Reception', pt: 'Recepção 24h' }, synonyms: ['recepcion 24h', 'recepción 24h', '24h reception'] },
    { slug: 'free_wifi', i18n: { es: 'Wi‑Fi gratis', en: 'Free Wi‑Fi', pt: 'Wi‑Fi grátis' }, synonyms: ['wifi', 'wi‑fi', 'wi-fi', 'free wifi', 'wifi gratis', 'wi fi gratis'] },
    { slug: 'luggage_storage', i18n: { es: 'Guardaequipaje', en: 'Luggage storage', pt: 'Guarda-volumes' }, synonyms: ['guardaequipaje', 'luggage storage', 'guarda-volumes'] },
    { slug: 'concierge', i18n: { es: 'Conserjería', en: 'Concierge', pt: 'Concierge' }, synonyms: ['conserjeria', 'conserjería', 'concierge'] },
    { slug: 'safe_box', i18n: { es: 'Caja de seguridad', en: 'Safe box', pt: 'Cofre' }, synonyms: ['caja de seguridad', 'cofre', 'safe'] },
    { slug: 'transfers', i18n: { es: 'Transfers', en: 'Transfers', pt: 'Transfers' }, synonyms: ['transfer', 'transfers'] },
    { slug: 'tours', i18n: { es: 'Tours', en: 'Tours', pt: 'Passeios' }, synonyms: ['tours', 'passeios', 'excursiones'] },
    { slug: 'bicycles', i18n: { es: 'Bicicletas', en: 'Bicycles', pt: 'Bicicletas' }, synonyms: ['bicicletas', 'bikes'] },
    { slug: 'high_chairs', i18n: { es: 'Sillas altas', en: 'High chairs', pt: 'Cadeiras altas' }, synonyms: ['sillas altas', 'high chairs'] },
    { slug: 'cribs', i18n: { es: 'Cunas', en: 'Cribs', pt: 'Berços' }, synonyms: ['cunas', 'cribs', 'bercos', 'berços'] },
    { slug: 'sauna', i18n: { es: 'Sauna', en: 'Sauna', pt: 'Sauna' }, synonyms: ['sauna'] },
    { slug: 'hot_tub', i18n: { es: 'Hidromasaje', en: 'Hot tub', pt: 'Hidromassagem' }, synonyms: ['hidromasaje', 'jacuzzi', 'hot tub'] },
    { slug: 'meeting_rooms', i18n: { es: 'Salas de reuniones', en: 'Meeting rooms', pt: 'Salas de reunião' }, synonyms: ['salas de reuniones', 'meeting rooms', 'salas de reuniao', 'salas de reunião'] },
    { slug: 'business_center', i18n: { es: 'Business center', en: 'Business center', pt: 'Business center' }, synonyms: ['business center'] },
    { slug: 'terrace', i18n: { es: 'Terraza', en: 'Terrace', pt: 'Terraço' }, synonyms: ['terraza', 'terrace', 'terraço', 'terraco'] },
    { slug: 'garden', i18n: { es: 'Jardín', en: 'Garden', pt: 'Jardim' }, synonyms: ['jardin', 'jardín', 'garden', 'jardim'] },
    { slug: 'pet_friendly', i18n: { es: 'Pet‑friendly', en: 'Pet‑friendly', pt: 'Pet‑friendly' }, synonyms: ['pet friendly', 'pet‑friendly', 'mascotas', 'acepta mascotas'] },
    { slug: 'laundry', i18n: { es: 'Lavandería', en: 'Laundry', pt: 'Lavanderia' }, synonyms: ['lavanderia', 'lavandería', 'laundry'] },
    { slug: 'coworking', i18n: { es: 'Co‑working', en: 'Co‑working', pt: 'Co‑working' }, synonyms: ['co working', 'co‑working', 'coworking'] },
];

const indexSynonymToSlug: Record<string, string> = {};
for (const a of AMENITIES_TAXONOMY) {
    for (const s of a.synonyms) indexSynonymToSlug[s.toLowerCase()] = a.slug;
}

function normalizeText(s: string): string {
    return s
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
}

export function normalizeAmenityTags(input: string[]): string[] {
    const out: string[] = [];
    for (const raw of input) {
        const norm = normalizeText(String(raw));
        const slug = indexSynonymToSlug[norm] || generateCustomSlug(norm);
        if (!out.includes(slug)) out.push(slug);
    }
    return out;
}

export function amenityLabel(slug: string, lang: Lang): string {
    const item = AMENITIES_TAXONOMY.find(a => a.slug === slug);
    if (!item) {
        if (slug.startsWith('custom_')) {
            const human = slug.replace(/^custom_/, '').replace(/_/g, ' ');
            return human.charAt(0).toUpperCase() + human.slice(1);
        }
        return slug;
    }
    return item.i18n[lang] || item.i18n.en;
}

export function generateCustomSlug(norm: string): string {
    const base = norm.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return 'custom_' + base.slice(0, 40);
}
