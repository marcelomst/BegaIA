// Path: /home/marcelo/begasist/lib/prompts/templates.ts

// ==================== Tipos base del contrato ====================
import type { PromptType } from "@/types/prompt";
import { PROMPT_TYPES } from "@/types/prompt";
export type Lang = 'es' | 'en' | 'pt';

// Categorías alineadas al grafo y al clasificador
export type Category =
    | 'retrieval_based'
    | 'reservation'
    | 'reservation_snapshot'
    | 'reservation_verify'
    | 'cancel_reservation'
    | 'amenities'
    | 'billing'
    | 'support'
    // Etapas del flujo de modificación (el clasificador puede enrutar aquí)
    | 'modify_reservation_field'
    | 'modify_reservation_value'
    | 'modify_reservation_confirm'
    // Categoría comodín que puede devolver el clasificador
    | 'other';

export type TemplateType = PromptType;

export type TemplateEntry = {
    promptKey: string;       // <<— alineado con hotel_content.promptKey
    title: string;
    body: string;
    type: TemplateType;
    lang: Lang;
};

export type TemplatesByCategory = Record<Exclude<Category, 'other'>, TemplateEntry[]>;

// ==================== Contrato / Especificación ====================

export const SUPPORTED_LANGS: Lang[] = ['es', 'en', 'pt'];

// Mapa (categoría del clasificador) → (nodo del grafo)
export const GRAPH_CATEGORY_TO_NODE: Record<Category, string> = {
    retrieval_based: 'handle_retrieval_based',
    reservation: 'handle_reservation',
    reservation_snapshot: 'handle_reservation_snapshot',
    reservation_verify: 'handle_reservation_verify',
    cancel_reservation: 'handle_cancel_reservation',
    amenities: 'handle_amenities',
    billing: 'handle_billing',
    support: 'handle_support',
    modify_reservation_field: 'ask_modify_field',
    modify_reservation_value: 'ask_new_value',
    modify_reservation_confirm: 'confirm_modification',
    other: 'handle_retrieval_based', // fallback definido en el grafo
};

// Categorías por defecto (fallback) cuando promptMetadata está vacío
export const defaultCategories: Category[] = [
    'retrieval_based',
    'reservation',
    'reservation_snapshot',
    'reservation_verify',
    'cancel_reservation',
    'amenities',
    'billing',
    'support',
    'modify_reservation_field',
    'modify_reservation_value',
    'modify_reservation_confirm',
];

// Claves válidas por categoría (para validar hotel_content.promptKey)
export const PROMPT_KEYS_BY_CATEGORY: Record<Exclude<Category, 'other'>, string[]> = {
    retrieval_based: ['kb_general', 'room_info', 'room_info_img', 'nearby_points', 'nearby_points_img', 'tourist_events', 'tourist_events_img', 'ambiguity_policy', 'arrivals_transport'],
    reservation: ['reservation_flow', 'modify_reservation'],
    reservation_snapshot: ['reservation_snapshot'],
    reservation_verify: ['reservation_verify'],
    cancel_reservation: ['cancellation_policy'],
    amenities: ['amenities_list', 'pool_gym_spa', 'breakfast_bar', 'parking'],
    billing: ['payments_and_billing', 'invoice_receipts'],
    support: ['contact_support', 'contact_channel_selector'],
    modify_reservation_field: ['modify_reservation_field'],
    modify_reservation_value: ['modify_reservation_value'],
    modify_reservation_confirm: ['modify_reservation_confirm'],
};

// Helper de routing: si el clasificador devuelve "other", mandamos a retrieval_based (como en el grafo)
export function resolveCategoryForGraph(category: Category): Exclude<Category, 'other'> {
    return category === 'other' ? 'retrieval_based' : category;
}

// ==================== Validación runtime p/ hotel_content ====================

export type HotelContentRecord = {
    hotelId: string;
    category: Category | string;
    promptKey: string;
    lang: Lang | string;
    version?: string | number;
    type: TemplateType | string;
    title?: string;
    body: string;
    createdAt?: string | number | Date;
    updatedAt?: string | number | Date;
};

// Valida que (category, promptKey, lang, type) respeten el contrato.
// Nota: permite 'other' pero la normaliza a 'retrieval_based' para enrutamiento.
export function validateHotelContentRecord(rec: HotelContentRecord): {
    ok: boolean;
    normalized?: HotelContentRecord & { category: Exclude<Category, 'other'>; lang: Lang; type: TemplateType };
    error?: string;
} {
    // lang
    if (!SUPPORTED_LANGS.includes(rec.lang as Lang)) {
        return { ok: false, error: `lang no soportado: ${rec.lang}. Debe ser uno de ${SUPPORTED_LANGS.join(', ')}` };
    }
    // type
    if (!PROMPT_TYPES.includes(rec.type as PromptType)) {
        return { ok: false, error: `type inválido: ${rec.type}. Debe ser ${PROMPT_TYPES.map(t => `'${t}'`).join(" | ")}` };
    }
    // category
    const cat = (rec.category as Category) === 'other' ? 'retrieval_based' : (rec.category as Category);
    if (!(Object.keys(PROMPT_KEYS_BY_CATEGORY) as (keyof typeof PROMPT_KEYS_BY_CATEGORY)[]).includes(cat as any)) {
        return { ok: false, error: `category inválida: ${rec.category}` };
    }
    // promptKey
    const allowedKeys = PROMPT_KEYS_BY_CATEGORY[cat as keyof typeof PROMPT_KEYS_BY_CATEGORY];
    if (!allowedKeys.includes(rec.promptKey)) {
        return { ok: false, error: `promptKey "${rec.promptKey}" no está permitido para category "${cat}". Permitidos: ${allowedKeys.join(', ')}` };
    }

    return {
        ok: true,
        normalized: {
            ...rec,
            category: cat as Exclude<Category, 'other'>,
            lang: rec.lang as Lang,
            type: rec.type as TemplateType,
        },
    };
}

// ==================== Plantillas (Spec + Seed global "system") ====================

export const templates: TemplatesByCategory = {
    retrieval_based: [
        // Español
        {
            promptKey: 'kb_general',
            title: 'Información general del hotel (KB general)',
            type: 'standard',
            lang: 'es',
            body:
                `# Información general del hotel\n\n` +
                `## Datos básicos\n\n` +
                `Nombre: [[key: hotelName | default: (Completar hotelName en hotel_config)]]\n` +
                `Ubicación: [[key: address | default: (Completar address)]], [[key: city | default: (Completar city)]], [[key: country | default: (Completar country)]]\n\n` +
                `Descripción breve: [[key: hotelProfile.shortDescription | default: (Completar hotelProfile.shortDescription)]]\n` +
                `Tipo de hotel: [[key: hotelProfile.propertyType | default: (Completar hotelProfile.propertyType)]]\n` +
                `Estilo: [[key: hotelProfile.style | default: (Completar hotelProfile.style)]]\n` +
                `Estrellas: [[key: hotelProfile.starRating | default: (Completar hotelProfile.starRating)]]\n` +
                `Marca: [[key: hotelProfile.brand | default: (Completar hotelProfile.brand)]]\n\n` +
                `Puntos de interés y atracciones cercanas: [[key: attractionsInfo | default: (Completar attractionsInfo)]]\n\n` +
                `Idioma principal de atención: [[key: defaultLanguage | default: es]]\n` +
                `Zona horaria: [[key: timezone | default: America/Montevideo]]\n\n` +
                `## Contacto\n\n` +
                `Teléfono: [[key: contacts.phone | default: (Completar contacts.phone en hotel_config)]]\n` +
                `WhatsApp: [[key: contacts.whatsapp | default: (Completar contacts.whatsapp en hotel_config)]]\n` +
                `Email: [[key: contacts.email | default: (Completar contacts.email en hotel_config)]]\n` +
                `Sitio web: [[key: contacts.website | default: (Completar contacts.website en hotel_config)]]\n\n` +
                `## Horarios\n\n` +
                `Check-in: [[key: schedules.checkIn | default: (Definir schedules.checkIn en hotel_config)]]\n` +
                `Check-out: [[key: schedules.checkOut | default: (Definir schedules.checkOut en hotel_config)]]\n` +
                `Desayuno: [[key: schedules.breakfast | default: (Definir schedules.breakfast en hotel_config)]]\n` +
                `Horas de silencio: [[key: schedules.quietHours | default: (Definir schedules.quietHours en hotel_config)]]\n\n` +
                `## Canales habilitados\n\n` +
                `- Web: [[key: channelConfigs.web.enabled | default: (Definir channelConfigs.web.enabled)]]\n` +
                `- WhatsApp: [[key: channelConfigs.whatsapp.enabled | default: (Definir channelConfigs.whatsapp.enabled)]]\n` +
                `- Email: [[key: channelConfigs.email.enabled | default: (Definir channelConfigs.email.enabled)]]`,
        },
        {
            promptKey: 'room_info',
            title: 'Tipos de habitaciones – resumen',
            type: 'standard',
            lang: 'es',
            body:
                `# Tipos de habitaciones – resumen\n\n` +
                `[[each: rooms | default: (Completar rooms en hotel_config) ->\n` +
                `- [[name | default: Nombre]]\n` +
                `  - Capacidad: [[capacity | default: ?]] huéspedes\n` +
                `  - Camas: [[beds | default: ?]]\n` +
                `  - Superficie: [[sizeM2 | default: ?]] m²\n` +
                `  - Descripción: [[description | default: (Agregar descripción)]]\n` +
                `  - Highlights:\n` +
                `  [[each: highlights | default: (Sin highlights) ->     - [[item]]]]\n` +
                `  - Imágenes:\n` +
                `  [[each: images | default: (Sin imágenes) ->     - !img([[item]])]]\n` +
                `  - Accesible: [[accessible | default: (sin dato)]]\n` +
                `]]`,
        },
        {
            promptKey: 'room_info_img',
            title: 'Habitaciones con iconos e imágenes',
            type: 'presentation',
            lang: 'es',
            body:
                `# Tipos de habitaciones – con iconos e imágenes\n\n` +
                `[[each: rooms | default: (Completar rooms en hotel_config) ->\n` +
                `Tipo: [[name | default: Nombre]]\n` +
                `Icono: [[icon | default: 🛏️]]\n` +
                `Resumen visual: [[description | default: (Sin descripción breve)]]\n` +
                `Images:\n` +
                `[[each: images | default: (Sin imágenes) -> - [[item]]]]\n` +
                `]]`,
        },
        {
            promptKey: 'nearby_points',
            title: 'Puntos de interés cercanos',
            type: 'standard',
            lang: 'es',
            body:
                `# Puntos de interés cercanos\n\n` +
                `Hotel: [[key: hotelName | default: (Completar hotelName en hotel_config)]]\n` +
                `Ubicación: [[key: address | default: (Completar address)]], [[key: city | default: (Completar city)]], [[key: country | default: (Completar country)]]\n\n` +
                `Lista (6-10):\n` +
                `[[each: attractions | default: - Nombre: (Sin puntos cargados)\n` +
                `  - Descripción corta: (Sin descripción)\n` +
                `  - Search query: (Sin query)\n` +
                ` -> - Nombre: [[name | default: (Sin nombre)]]\n` +
                `  - Descripción corta: [[notes | default: (Sin descripción)]]\n` +
                `  - Search query: [[name | default: (Sin query)]]\n` +
                `]]`,
        },
        {
            promptKey: 'nearby_points_img',
            title: 'Puntos de interés – con carrusel',
            type: 'presentation',
            lang: 'es',
            body:
                `Titulo: Puntos de interés cercanos – con carrusel\n` +
                `Categoria: retrieval_based\n` +
                `Resumen: Respuesta con texto amigable y un carrusel opcional de imágenes.\n` +
                `Cuerpo:\n` +
                `- Texto: resumen breve con 6-10 puntos de interés.\n` +
                `- RichResponse.carousel: [ { title, subtitle, images: [ { url, alt } ] } ]\n` +
                `Notas:\n` +
                `- 3-5 items en el carrusel, 2-4 imágenes por item.\n` +
                `- Si no hay imágenes, devolver carousel vacío pero mantener el texto.`,
        },
        {
            promptKey: 'tourist_events',
            title: 'Eventos turísticos',
            type: 'standard',
            lang: 'es',
            body:
                `# [[key: runtime.title | default: Eventos turísticos]]\n\n` +
                `Rango: [[key: runtime.rangeText | default: (sin rango)]]\n` +
                `Ciudad: [[key: city | default: (sin ciudad)]]\n\n` +
                `Eventos:\n` +
                `[[key: runtime.eventsBlock | default: No encontré eventos cargados para este período.\n` +
                `Podés consultar fuentes actualizadas y, si querés, ampliar rango o ciudad.\n\n` +
                `- Paseos por la rambla y playas cercanas\n` +
                `- Gastronomía local y mercados\n` +
                `- Miradores y atardeceres\n` +
                `- Museos o centros culturales\n` +
                `]]\n` +
                `[[key: runtime.questionBlock | default: ]]`,
        },
        {
            promptKey: 'tourist_events_img',
            title: 'Eventos turísticos con imágenes',
            type: 'standard',
            lang: 'es',
            body:
                `# [[key: runtime.title | default: Eventos turísticos]]\n\n` +
                `Rango: [[key: runtime.rangeText | default: (sin rango)]]\n` +
                `Ciudad: [[key: city | default: (sin ciudad)]]\n\n` +
                `Eventos:\n` +
                `[[key: runtime.eventsBlock | default: No encontré eventos cargados para este período.\n` +
                `Podés consultar fuentes actualizadas y, si querés, ampliar rango o ciudad.\n\n` +
                `- Paseos por la rambla y playas cercanas\n` +
                `- Gastronomía local y mercados\n` +
                `- Miradores y atardeceres\n` +
                `- Museos o centros culturales\n` +
                `]]\n` +
                `[[key: runtime.questionBlock | default: ]]`,
        },
        {
            promptKey: 'ambiguity_policy',
            title: 'Política de ambigüedad y desambiguación',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Política de ambigüedad y desambiguación\n` +
                `Categoria: retrieval_based\n` +
                `Resumen: Guía para manejar consultas ambiguas del huésped.\n` +
                `Cuerpo:\n` +
                `- Señales de ambigüedad (falta de fechas, tipo de habitación no especificado, términos vagos):\n` +
                `- Preguntas de aclaración sugeridas (2-3 por caso):\n` +
                `- Ejemplos de reformulación segura (confirmar antes de accionar):\n` +
                `- Respuestas cuando falta información crítica (pedir datos mínimos):\n` +
                `- Tono y límites (no inventar; pedir confirmación explícita):`,
        },
        // Inglés
        {
            promptKey: 'kb_general',
            title: 'General hotel information (KB general)',
            type: 'standard',
            lang: 'en',
            body:
                `# General hotel information\n\n` +
                `## Basic details\n\n` +
                `Name: [[key: hotelName | default: (Fill hotelName in hotel_config)]]\n` +
                `Location: [[key: address | default: (Fill address)]], [[key: city | default: (Fill city)]], [[key: country | default: (Fill country)]]\n\n` +
                `Short description: [[key: hotelProfile.shortDescription | default: (Fill hotelProfile.shortDescription)]]\n` +
                `Property type: [[key: hotelProfile.propertyType | default: (Fill hotelProfile.propertyType)]]\n` +
                `Style: [[key: hotelProfile.style | default: (Fill hotelProfile.style)]]\n` +
                `Star rating: [[key: hotelProfile.starRating | default: (Fill hotelProfile.starRating)]]\n` +
                `Brand: [[key: hotelProfile.brand | default: (Fill hotelProfile.brand)]]\n\n` +
                `Nearby points of interest and attractions: [[key: attractionsInfo | default: (Fill attractionsInfo)]]\n\n` +
                `Main service language: [[key: defaultLanguage | default: en]]\n` +
                `Timezone: [[key: timezone | default: America/Montevideo]]\n\n` +
                `## Contact\n\n` +
                `Phone: [[key: contacts.phone | default: (Fill contacts.phone in hotel_config)]]\n` +
                `WhatsApp: [[key: contacts.whatsapp | default: (Fill contacts.whatsapp in hotel_config)]]\n` +
                `Email: [[key: contacts.email | default: (Fill contacts.email in hotel_config)]]\n` +
                `Website: [[key: contacts.website | default: (Fill contacts.website in hotel_config)]]\n\n` +
                `## Schedules\n\n` +
                `Check-in: [[key: schedules.checkIn | default: (Define schedules.checkIn in hotel_config)]]\n` +
                `Check-out: [[key: schedules.checkOut | default: (Define schedules.checkOut in hotel_config)]]\n` +
                `Breakfast: [[key: schedules.breakfast | default: (Define schedules.breakfast in hotel_config)]]\n` +
                `Quiet hours: [[key: schedules.quietHours | default: (Define schedules.quietHours in hotel_config)]]\n\n` +
                `## Enabled channels\n\n` +
                `- Web: [[key: channelConfigs.web.enabled | default: (Define channelConfigs.web.enabled)]]\n` +
                `- WhatsApp: [[key: channelConfigs.whatsapp.enabled | default: (Define channelConfigs.whatsapp.enabled)]]\n` +
                `- Email: [[key: channelConfigs.email.enabled | default: (Define channelConfigs.email.enabled)]]`,
        },
        {
            promptKey: 'room_info',
            title: 'Room types – summary',
            type: 'standard',
            lang: 'en',
            body:
                `# Room types – summary\n\n` +
                `[[each: rooms | default: (Fill rooms in hotel_config) ->\n` +
                `- [[name | default: Name]]\n` +
                `  - Capacity: [[capacity | default: ?]] guests\n` +
                `  - Beds: [[beds | default: ?]]\n` +
                `  - Size: [[sizeM2 | default: ?]] m²\n` +
                `  - Description: [[description | default: (Add description)]]\n` +
                `  - Highlights:\n` +
                `  [[each: highlights | default: (No highlights) ->     - [[item]]]]\n` +
                `  - Images:\n` +
                `  [[each: images | default: (No images) ->     - !img([[item]])]]\n` +
                `  - Accessible: [[accessible | default: (no data)]]\n` +
                `]]`,
        },
        {
            promptKey: 'room_info_img',
            title: 'Rooms with icons and images',
            type: 'presentation',
            lang: 'en',
            body:
                `# Room types – with icons and images\n\n` +
                `[[each: rooms | default: (Fill rooms in hotel_config) ->\n` +
                `Type: [[name | default: Name]]\n` +
                `Icon: [[icon | default: 🛏️]]\n` +
                `Visual summary: [[description | default: (No short description)]]\n` +
                `Images:\n` +
                `[[each: images | default: (No images) -> - [[item]]]]\n` +
                `]]`,
        },
        {
            promptKey: 'nearby_points',
            title: 'Nearby points of interest',
            type: 'standard',
            lang: 'en',
            body:
                `# Nearby points of interest\n\n` +
                `Hotel: [[key: hotelName | default: (Fill hotelName in hotel_config)]]\n` +
                `Location: [[key: address | default: (Fill address)]], [[key: city | default: (Fill city)]], [[key: country | default: (Fill country)]]\n\n` +
                `List (6-10):\n` +
                `[[each: attractions | default: - Name: (No points loaded)\n` +
                `  - Short description: (No description)\n` +
                `  - Search query: (No query)\n` +
                ` -> - Name: [[name | default: (No name)]]\n` +
                `  - Short description: [[notes | default: (No description)]]\n` +
                `  - Search query: [[name | default: (No query)]]\n` +
                `]]`,
        },
        {
            promptKey: 'nearby_points_img',
            title: 'Nearby points – with carousel',
            type: 'presentation',
            lang: 'en',
            body:
                `Title: Nearby points of interest – with carousel\n` +
                `Category: retrieval_based\n` +
                `Summary: Reply with friendly text and an optional image carousel.\n` +
                `Body:\n` +
                `- Text: brief summary with 6-10 points of interest.\n` +
                `- RichResponse.carousel: [ { title, subtitle, images: [ { url, alt } ] } ]\n` +
                `Notes:\n` +
                `- 3-5 items in the carousel, 2-4 images per item.\n` +
                `- If there are no images, return an empty carousel but keep the text.`,
        },
        {
            promptKey: 'tourist_events',
            title: 'Tourist events',
            type: 'standard',
            lang: 'en',
            body:
                `# [[key: runtime.title | default: Tourist events]]\n\n` +
                `Range: [[key: runtime.rangeText | default: (no range)]]\n` +
                `City: [[key: city | default: (no city)]]\n\n` +
                `Events:\n` +
                `[[key: runtime.eventsBlock | default: I couldn't find any events loaded for this period.\n` +
                `You can check up‑to‑date sources and, if you want, I can expand the range or city.\n\n` +
                `- Walks along the waterfront and nearby beaches\n` +
                `- Local food spots and markets\n` +
                `- Viewpoints and sunsets\n` +
                `- Museums or cultural centers\n` +
                `]]\n` +
                `[[key: runtime.questionBlock | default: ]]`,
        },
        {
            promptKey: 'tourist_events_img',
            title: 'Tourist events with images',
            type: 'standard',
            lang: 'en',
            body:
                `# [[key: runtime.title | default: Tourist events]]\n\n` +
                `Range: [[key: runtime.rangeText | default: (no range)]]\n` +
                `City: [[key: city | default: (no city)]]\n\n` +
                `Events:\n` +
                `[[key: runtime.eventsBlock | default: I couldn't find any events loaded for this period.\n` +
                `You can check up‑to‑date sources and, if you want, I can expand the range or city.\n\n` +
                `- Walks along the waterfront and nearby beaches\n` +
                `- Local food spots and markets\n` +
                `- Viewpoints and sunsets\n` +
                `- Museums or cultural centers\n` +
                `]]\n` +
                `[[key: runtime.questionBlock | default: ]]`,
        },
        {
            promptKey: 'ambiguity_policy',
            title: 'Ambiguity and disambiguation policy',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Ambiguity and disambiguation policy\n` +
                `Category: retrieval_based\n` +
                `Summary: Guide to handle ambiguous guest queries.\n` +
                `Body:\n` +
                `- Ambiguity signals (missing dates, unspecified room type, vague terms):\n` +
                `- Suggested clarification questions (2-3 per case):\n` +
                `- Examples of safe reformulation (confirm before acting):\n` +
                `- Responses when critical info is missing (ask for minimum data):\n` +
                `- Tone and limits (do not invent; ask for explicit confirmation):`,
        },
        // Portugués
        {
            promptKey: 'kb_general',
            title: 'Informações gerais do hotel (KB geral)',
            type: 'standard',
            lang: 'pt',
            body:
                `# Informações gerais do hotel\n\n` +
                `## Dados básicos\n\n` +
                `Nome: [[key: hotelName | default: (Preencher hotelName em hotel_config)]]\n` +
                `Localização: [[key: address | default: (Preencher address)]], [[key: city | default: (Preencher city)]], [[key: country | default: (Preencher country)]]\n\n` +
                `Descrição breve: [[key: hotelProfile.shortDescription | default: (Preencher hotelProfile.shortDescription)]]\n` +
                `Tipo de hotel: [[key: hotelProfile.propertyType | default: (Preencher hotelProfile.propertyType)]]\n` +
                `Estilo: [[key: hotelProfile.style | default: (Preencher hotelProfile.style)]]\n` +
                `Estrelas: [[key: hotelProfile.starRating | default: (Preencher hotelProfile.starRating)]]\n` +
                `Marca: [[key: hotelProfile.brand | default: (Preencher hotelProfile.brand)]]\n\n` +
                `Pontos de interesse e atracoes proximas: [[key: attractionsInfo | default: (Preencher attractionsInfo)]]\n\n` +
                `Idioma principal de atendimento: [[key: defaultLanguage | default: pt]]\n` +
                `Fuso horário: [[key: timezone | default: America/Montevideo]]\n\n` +
                `## Contato\n\n` +
                `Telefone: [[key: contacts.phone | default: (Preencher contacts.phone em hotel_config)]]\n` +
                `WhatsApp: [[key: contacts.whatsapp | default: (Preencher contacts.whatsapp em hotel_config)]]\n` +
                `Email: [[key: contacts.email | default: (Preencher contacts.email em hotel_config)]]\n` +
                `Site: [[key: contacts.website | default: (Preencher contacts.website em hotel_config)]]\n\n` +
                `## Horários\n\n` +
                `Check-in: [[key: schedules.checkIn | default: (Definir schedules.checkIn em hotel_config)]]\n` +
                `Check-out: [[key: schedules.checkOut | default: (Definir schedules.checkOut em hotel_config)]]\n` +
                `Café da manhã: [[key: schedules.breakfast | default: (Definir schedules.breakfast em hotel_config)]]\n` +
                `Horário de silêncio: [[key: schedules.quietHours | default: (Definir schedules.quietHours em hotel_config)]]\n\n` +
                `## Canais ativos\n\n` +
                `- Web: [[key: channelConfigs.web.enabled | default: (Definir channelConfigs.web.enabled)]]\n` +
                `- WhatsApp: [[key: channelConfigs.whatsapp.enabled | default: (Definir channelConfigs.whatsapp.enabled)]]\n` +
                `- Email: [[key: channelConfigs.email.enabled | default: (Definir channelConfigs.email.enabled)]]`,
        },
        {
            promptKey: 'room_info',
            title: 'Tipos de quartos – resumo',
            type: 'standard',
            lang: 'pt',
            body:
                `# Tipos de quartos – resumo\n\n` +
                `[[each: rooms | default: (Preencher rooms em hotel_config) ->\n` +
                `- [[name | default: Nome]]\n` +
                `  - Capacidade: [[capacity | default: ?]] hóspedes\n` +
                `  - Camas: [[beds | default: ?]]\n` +
                `  - Área: [[sizeM2 | default: ?]] m²\n` +
                `  - Descrição: [[description | default: (Adicionar descrição)]]\n` +
                `  - Destaques:\n` +
                `  [[each: highlights | default: (Sem destaques) ->     - [[item]]]]\n` +
                `  - Imagens:\n` +
                `  [[each: images | default: (Sem imagens) ->     - !img([[item]])]]\n` +
                `  - Acessível: [[accessible | default: (sem dado)]]\n` +
                `]]`,
        },
        {
            promptKey: 'room_info_img',
            title: 'Quartos com ícones e imagens',
            type: 'presentation',
            lang: 'pt',
            body:
                `# Tipos de quartos – com ícones e imagens\n\n` +
                `[[each: rooms | default: (Preencher rooms em hotel_config) ->\n` +
                `Tipo: [[name | default: Nome]]\n` +
                `Ícone: [[icon | default: 🛏️]]\n` +
                `Resumo visual: [[description | default: (Sem descrição curta)]]\n` +
                `Imagens:\n` +
                `[[each: images | default: (Sem imagens) -> - [[item]]]]\n` +
                `]]`,
        },
        {
            promptKey: 'nearby_points',
            title: 'Pontos de interesse próximos',
            type: 'standard',
            lang: 'pt',
            body:
                `# Pontos de interesse próximos\n\n` +
                `Hotel: [[key: hotelName | default: (Preencher hotelName em hotel_config)]]\n` +
                `Localização: [[key: address | default: (Preencher address)]], [[key: city | default: (Preencher city)]], [[key: country | default: (Preencher country)]]\n\n` +
                `Lista (6-10):\n` +
                `[[each: attractions | default: - Nome: (Sem pontos carregados)\n` +
                `  - Descrição curta: (Sem descrição)\n` +
                `  - Search query: (Sem query)\n` +
                ` -> - Nome: [[name | default: (Sem nome)]]\n` +
                `  - Descrição curta: [[notes | default: (Sem descrição)]]\n` +
                `  - Search query: [[name | default: (Sem query)]]\n` +
                `]]`,
        },
        {
            promptKey: 'nearby_points_img',
            title: 'Pontos de interesse – com carrossel',
            type: 'presentation',
            lang: 'pt',
            body:
                `Título: Pontos de interesse próximos – com carrossel\n` +
                `Categoria: retrieval_based\n` +
                `Resumo: Resposta com texto amigável e um carrossel opcional de imagens.\n` +
                `Corpo:\n` +
                `- Texto: resumo breve com 6-10 pontos de interesse.\n` +
                `- RichResponse.carousel: [ { title, subtitle, images: [ { url, alt } ] } ]\n` +
                `Notas:\n` +
                `- 3-5 itens no carrossel, 2-4 imagens por item.\n` +
                `- Se não houver imagens, devolver carousel vazio mas manter o texto.`,
        },
        {
            promptKey: 'tourist_events',
            title: 'Eventos turísticos',
            type: 'standard',
            lang: 'pt',
            body:
                `# [[key: runtime.title | default: Eventos turísticos]]\n\n` +
                `Intervalo: [[key: runtime.rangeText | default: (sem intervalo)]]\n` +
                `Cidade: [[key: city | default: (sem cidade)]]\n\n` +
                `Eventos:\n` +
                `[[key: runtime.eventsBlock | default: Não encontrei eventos carregados para este período.\n` +
                `Você pode consultar fontes atualizadas e, se quiser, posso ampliar o intervalo ou a cidade.\n\n` +
                `- Passeios pela orla e praias próximas\n` +
                `- Gastronomia local e mercados\n` +
                `- Mirantes e pôr do sol\n` +
                `- Museus ou centros culturais\n` +
                `]]\n` +
                `[[key: runtime.questionBlock | default: ]]`,
        },
        {
            promptKey: 'tourist_events_img',
            title: 'Eventos turísticos com imagens',
            type: 'standard',
            lang: 'pt',
            body:
                `# [[key: runtime.title | default: Eventos turísticos]]\n\n` +
                `Intervalo: [[key: runtime.rangeText | default: (sem intervalo)]]\n` +
                `Cidade: [[key: city | default: (sem cidade)]]\n\n` +
                `Eventos:\n` +
                `[[key: runtime.eventsBlock | default: Não encontrei eventos carregados para este período.\n` +
                `Você pode consultar fontes atualizadas e, se quiser, posso ampliar o intervalo ou a cidade.\n\n` +
                `- Passeios pela orla e praias próximas\n` +
                `- Gastronomia local e mercados\n` +
                `- Mirantes e pôr do sol\n` +
                `- Museus ou centros culturais\n` +
                `]]\n` +
                `[[key: runtime.questionBlock | default: ]]`,
        },
        {
            promptKey: 'ambiguity_policy',
            title: 'Política de ambiguidade e desambiguação',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Política de ambiguidade e desambiguação\n` +
                `Categoria: retrieval_based\n` +
                `Resumo: Guia para lidar com consultas ambíguas de hóspedes.\n` +
                `Corpo:\n` +
                `- Sinais de ambiguidade (falta de datas, tipo de quarto não especificado, termos vagos):\n` +
                `- Perguntas de esclarecimento sugeridas (2-3 por caso):\n` +
                `- Exemplos de reformulação segura (confirmar antes de agir):\n` +
                `- Respostas quando falta informação crítica (pedir dados mínimos):\n` +
                `- Tom e limites (não inventar; pedir confirmação explícita):`,
        },
        // Transporte de llegada en los tres idiomas
        {
            promptKey: 'arrivals_transport',
            title: 'Transporte de llegada',
            body:
                `# Transporte de llegada\n\n` +
                `Hotel: [[key: hotelName | default: (Completar hotelName)]]\n` +
                `Ubicación: [[key: address | default: (Completar address)]], [[key: city | default: (Completar city)]], [[key: country | default: (Completar country)]]\n\n` +
                `Aeropuertos cercanos:\n` +
                `[[each: airports | default: - (No hay aeropuertos cargados)\n ->` +
                `- [[code | default: IATA]] — [[name | default: Aeropuerto]]` +
                ` ([[distanceKm | default: ?]] km, [[driveTime | default: tiempo estimado]])` +
                `]]\n\n` +
                `Opciones de transporte:\n` +
                `- Transfer privado: [[key: transport.hasPrivateTransfer | default: (sin dato)]]\n` +
                `- Notas transfer: [[key: transport.transferNotes | default: (Sin notas)]]\n` +
                `- Taxi/remise/apps: [[key: transport.taxiNotes | default: (Sin notas)]]\n` +
                `- Bus/ómnibus: [[key: transport.busNotes | default: (Sin notas)]]\n\n` +
                `¿Querés que te recomiende la opción más conveniente según tu horario de llegada?`,
            type: 'standard',
            lang: 'es',
        },
        {
            promptKey: 'arrivals_transport',
            title: 'Arrival transport',
            body:
                `# Arrival transport\n\n` +
                `Hotel: [[key: hotelName | default: (Fill hotelName)]]\n` +
                `Location: [[key: address | default: (Fill address)]], [[key: city | default: (Fill city)]], [[key: country | default: (Fill country)]]\n\n` +
                `Nearby airports:\n` +
                `[[each: airports | default: - (No airports loaded)\n ->` +
                `- [[code | default: IATA]] — [[name | default: Airport]]` +
                ` ([[distanceKm | default: ?]] km, [[driveTime | default: estimated drive time]])` +
                `]]\n\n` +
                `Transport options:\n` +
                `- Private transfer: [[key: transport.hasPrivateTransfer | default: (no data)]]\n` +
                `- Transfer notes: [[key: transport.transferNotes | default: (No notes)]]\n` +
                `- Taxi/ride-hailing: [[key: transport.taxiNotes | default: (No notes)]]\n` +
                `- Bus/public transport: [[key: transport.busNotes | default: (No notes)]]\n\n` +
                `Do you want me to suggest the best option based on your arrival time?`,
            type: 'standard',
            lang: 'en',
        },
        {
            promptKey: 'arrivals_transport',
            title: 'Transporte de chegada',
            body:
                `# Transporte de chegada\n\n` +
                `Hotel: [[key: hotelName | default: (Preencher hotelName)]]\n` +
                `Localização: [[key: address | default: (Preencher address)]], [[key: city | default: (Preencher city)]], [[key: country | default: (Preencher country)]]\n\n` +
                `Aeroportos próximos:\n` +
                `[[each: airports | default: - (Sem aeroportos carregados)\n ->` +
                `- [[code | default: IATA]] — [[name | default: Aeroporto]]` +
                ` ([[distanceKm | default: ?]] km, [[driveTime | default: tempo estimado]])` +
                `]]\n\n` +
                `Opções de transporte:\n` +
                `- Transfer privado: [[key: transport.hasPrivateTransfer | default: (sem dado)]]\n` +
                `- Notas do transfer: [[key: transport.transferNotes | default: (Sem notas)]]\n` +
                `- Táxi/app: [[key: transport.taxiNotes | default: (Sem notas)]]\n` +
                `- Ônibus/transporte público: [[key: transport.busNotes | default: (Sem notas)]]\n\n` +
                `Quer que eu recomende a opção mais conveniente para seu horário de chegada?`,
            type: 'standard',
            lang: 'pt',
        },
    ],

    reservation: [
        {
            promptKey: 'reservation_flow',
            title: 'Flujo de reserva – Datos necesarios',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Flujo de reserva – Datos necesarios\n` +
                `Categoria: reservation\n` +
                `Cuerpo:\n` +
                `- Datos requeridos (mínimos): nombre completo, tipo de habitación, check-in, check-out, huéspedes.\n` +
                `- Orden sugerido: 1) fechas, 2) huéspedes, 3) habitación, 4) nombre, 5) recapitulación.\n` +
                `- Validaciones: check-out > check-in; fechas válidas; huéspedes <= capacidad; tipo de habitación disponible.\n` +
                `- Si falta un dato, pedir SOLO ese dato faltante.\n` +
                `- Antes de confirmar, mostrar resumen completo y pedir confirmación explícita ("¿Confirmás esta reserva?").`,
        },
        {
            promptKey: 'reservation_flow',
            title: 'Reservation flow – Required data',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Reservation flow – Required data\n` +
                `Category: reservation\n` +
                `Body:\n` +
                `- Required data: full name, room type, check-in, check-out, guests\n` +
                `- Suggested question order:\n` +
                `- Rules/validations (valid dates, room capacity):`,
        },
        {
            promptKey: 'reservation_flow',
            title: 'Fluxo de reserva – Dados necessários',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Fluxo de reserva – Dados necessários\n` +
                `Categoria: reservation\n` +
                `Corpo:\n` +
                `- Dados requeridos: nome completo, tipo de quarto, check-in, check-out, hóspedes\n` +
                `- Ordem sugerida de perguntas:\n` +
                `- Regras/validações (datas válidas, capacidade do quarto):`,
        },
        // Playbook general informativo
        {
            promptKey: 'modify_reservation',
            title: 'Modificar reserva – Campo y nuevo valor',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Modificar reserva – Campo y nuevo valor\n` +
                `Categoria: reservation\n` +
                `Cuerpo:\n` +
                `- Campos modificables: fechas, nombre del huésped, tipo de habitación, cantidad de huéspedes.\n` +
                `- Si la reserva está confirmada y no hay código, pedir código de reserva antes de modificar.\n` +
                `- Aplicar cambio por pasos: seleccionar campo -> pedir nuevo valor -> validar -> confirmar.\n` +
                `- Mostrar snapshot previo + cambio propuesto antes de aplicar.\n` +
                `- Si el huésped no confirma, no aplicar cambios.`,
        },
        {
            promptKey: 'modify_reservation',
            title: 'Modify reservation – Field and new value',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Modify reservation – Field and new value\n` +
                `Category: reservation\n` +
                `Body:\n` +
                `- Modifiable fields: dates, name, room, guests\n` +
                `- Change confirmation and snapshot:`,
        },
        {
            promptKey: 'modify_reservation',
            title: 'Modificar reserva – Campo e novo valor',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Modificar reserva – Campo e novo valor\n` +
                `Categoria: reservation\n` +
                `Corpo:\n` +
                `- Campos modificáveis: datas, nome, quarto, hóspedes\n` +
                `- Confirmação de mudanças e snapshot:`,
        },
    ],

    // Nuevas categorías 100% alineadas al grafo (flujo de modificación)
    modify_reservation_field: [
        {
            promptKey: 'modify_reservation_field',
            title: 'Modificar reserva – Seleccionar campo',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Modificar reserva – Seleccionar campo\n` +
                `Categoria: modify_reservation_field\n` +
                `Cuerpo:\n` +
                `- Pedir al huésped qué campo desea cambiar (fechas, nombre, habitación, huéspedes).\n` +
                `- Validar que el campo exista y sea modificable.\n` +
                `- Si hay ambigüedad, listar opciones claras y pedir confirmación.\n` +
                `- Responder en una sola pregunta concreta (sin mezclar múltiples pasos).`,
        },
        {
            promptKey: 'modify_reservation_field',
            title: 'Modify reservation – Select field',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Modify reservation – Select field\n` +
                `Category: modify_reservation_field\n` +
                `Body:\n` +
                `- Ask which field the guest wants to change (dates, name, room, guests).\n` +
                `- Validate it is a modifiable field.\n` +
                `- If ambiguous, list options and ask for confirmation.`,
        },
        {
            promptKey: 'modify_reservation_field',
            title: 'Modificar reserva – Selecionar campo',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Modificar reserva – Selecionar campo\n` +
                `Categoria: modify_reservation_field\n` +
                `Corpo:\n` +
                `- Pergunte qual campo o hóspede deseja alterar (datas, nome, quarto, hóspedes).\n` +
                `- Valide que o campo é modificável.\n` +
                `- Em caso de ambiguidade, liste opções e peça confirmação.`,
        },
    ],
    modify_reservation_value: [
        {
            promptKey: 'modify_reservation_value',
            title: 'Modificar reserva – Pedir nuevo valor',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Modificar reserva – Pedir nuevo valor\n` +
                `Categoria: modify_reservation_value\n` +
                `Cuerpo:\n` +
                `- Solicitar el nuevo valor del campo seleccionado (ej.: nuevas fechas, nuevo nombre).\n` +
                `- Validar formato y consistencia (ej.: rango de fechas válido, capacidad de habitación).\n` +
                `- Si no cumple, explicar el motivo y pedir un valor válido.\n` +
                `- Para fechas, pedir ambas si solo llega una; para huéspedes, validar entero positivo.`,
        },
        {
            promptKey: 'modify_reservation_value',
            title: 'Modify reservation – Ask for new value',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Modify reservation – Ask for new value\n` +
                `Category: modify_reservation_value\n` +
                `Body:\n` +
                `- Request the new value for the selected field (e.g., new dates, new name).\n` +
                `- Validate format and consistency (e.g., valid date range, room capacity).\n` +
                `- If invalid, explain and ask for a corrected value.`,
        },
        {
            promptKey: 'modify_reservation_value',
            title: 'Modificar reserva – Solicitar novo valor',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Modificar reserva – Solicitar novo valor\n` +
                `Categoria: modify_reservation_value\n` +
                `Corpo:\n` +
                `- Solicite o novo valor do campo selecionado (ex.: novas datas, novo nome).\n` +
                `- Valide formato e consistência (ex.: intervalo de datas válido, capacidade do quarto).\n` +
                `- Se inválido, explique e peça correção.`,
        },
    ],
    modify_reservation_confirm: [
        {
            promptKey: 'modify_reservation_confirm',
            title: 'Modificar reserva – Confirmación de cambios',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Modificar reserva – Confirmación de cambios\n` +
                `Categoria: modify_reservation_confirm\n` +
                `Cuerpo:\n` +
                `- Mostrar resumen (snapshot previo y cambios propuestos).\n` +
                `- Pedir confirmación explícita para aplicar.\n` +
                `- Si confirma, aplicar y responder con resumen final actualizado.\n` +
                `- Si no confirma, ofrecer corregir otro campo o finalizar sin cambios.`,
        },
        {
            promptKey: 'modify_reservation_confirm',
            title: 'Modify reservation – Change confirmation',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Modify reservation – Change confirmation\n` +
                `Category: modify_reservation_confirm\n` +
                `Body:\n` +
                `- Show a summary (previous snapshot and proposed changes).\n` +
                `- Ask for explicit confirmation to apply.\n` +
                `- Offer to modify another field or finish.`,
        },
        {
            promptKey: 'modify_reservation_confirm',
            title: 'Modificar reserva – Confirmação das mudanças',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Modificar reserva – Confirmação das mudanças\n` +
                `Categoria: modify_reservation_confirm\n` +
                `Corpo:\n` +
                `- Mostrar resumo (snapshot anterior e mudanças propostas).\n` +
                `- Solicitar confirmação explícita para aplicar.\n` +
                `- Oferecer modificar outro campo ou finalizar.`,
        },
    ],

    amenities: [
        {
            promptKey: 'amenities_list',
            title: 'Listado de amenities y horarios',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Amenities y horarios\n` +
                `Categoria: amenities\n` +
                `Cuerpo:\n` +
                `- Amenities disponibles:\n` +
                `[[each: amenitiesDisplay | default: - (Sin datos)\n` +
                ` -> - [[item]]]]\n` +
                `- Desayuno: [[key: schedules.breakfast | default: (Horario a confirmar)]]\n` +
                `- Piscina: [[key: amenities.schedules.pool | default: (Horario a confirmar)]]\n` +
                `- Gimnasio: [[key: amenities.schedules.gym | default: (Horario a confirmar)]]\n` +
                `- Spa: [[key: amenities.schedules.spa | default: (Horario a confirmar)]]\n` +
                `- Estacionamiento: [[key: amenities.parkingNotes | default: (Detalle a confirmar con recepción)]]\n` +
                `- Mascotas: [[key: policies.pets | default: (Condiciones a confirmar)]].\n` +
                `- Si un servicio no está habilitado por el momento, ofrecer alternativa y escalar a recepción.`,
        },
        {
            promptKey: 'amenities_list',
            title: 'Amenities list and schedules',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Amenities and schedules\n` +
                `Category: amenities\n` +
                `Body:\n` +
                `- Available amenities:\n` +
                `[[each: amenitiesDisplay | default: - (No data)\n` +
                ` -> - [[item]]]]\n` +
                `- Breakfast: [[key: schedules.breakfast | default: (Not defined)]].\n` +
                `- Pool: [[key: amenities.schedules.pool | default: (Not defined)]].\n` +
                `- Gym: [[key: amenities.schedules.gym | default: (Not defined)]].\n` +
                `- Spa: [[key: amenities.schedules.spa | default: (Not defined)]].\n` +
                `- Parking: [[key: amenities.parkingNotes | default: (No notes)]].\n` +
                `- Pets: [[key: policies.pets | default: (Not defined)]].`,
        },
        {
            promptKey: 'amenities_list',
            title: 'Lista de amenities e horários',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Amenities e horários\n` +
                `Categoria: amenities\n` +
                `Corpo:\n` +
                `- Amenities disponíveis:\n` +
                `[[each: amenitiesDisplay | default: - (Sem dados)\n` +
                ` -> - [[item]]]]\n` +
                `- Café da manhã: [[key: schedules.breakfast | default: (Não definido)]].\n` +
                `- Piscina: [[key: amenities.schedules.pool | default: (Não definido)]].\n` +
                `- Academia: [[key: amenities.schedules.gym | default: (Não definido)]].\n` +
                `- Spa: [[key: amenities.schedules.spa | default: (Não definido)]].\n` +
                `- Estacionamento: [[key: amenities.parkingNotes | default: (Sem notas)]].\n` +
                `- Animais: [[key: policies.pets | default: (Não definido)]].`,
        },
        {
            promptKey: 'pool_gym_spa',
            title: 'Piscina, Gimnasio y Spa – Horarios y reglas',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Piscina, Gimnasio y Spa – Horarios y reglas\n` +
                `Categoria: amenities\n` +
                `Cuerpo:\n` +
                `- Piscina: [[key: amenities.schedules.pool | default: (Horario a confirmar)]].\n` +
                `- Gimnasio: [[key: amenities.schedules.gym | default: (Horario a confirmar)]].\n` +
                `- Spa: [[key: amenities.schedules.spa | default: (Horario a confirmar)]].\n` +
                `- Reglas/observaciones: (Detalle a confirmar con recepción).\n` +
                `- Si un servicio no está habilitado por el momento, ofrecer alternativa y escalar a recepción.`,
        },
        {
            promptKey: 'pool_gym_spa',
            title: 'Pool, Gym and Spa – Schedules and rules',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Pool, Gym and Spa – Schedules and rules\n` +
                `Category: amenities\n` +
                `Body:\n` +
                `- Pool: (schedule, season, towels)\n` +
                `- Gym: (schedule, requirements)\n` +
                `- Spa: (services, reservations, cost)`,
        },
        {
            promptKey: 'pool_gym_spa',
            title: 'Piscina, Academia e Spa – Horários e regras',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Piscina, Academia e Spa – Horários e regras\n` +
                `Categoria: amenities\n` +
                `Corpo:\n` +
                `- Piscina: (horário, temporada, toalhas)\n` +
                `- Academia: (horário, requisitos)\n` +
                `- Spa: (serviços, reservas, custo)`,
        },
        {
            promptKey: 'breakfast_bar',
            title: 'Desayuno y Bar – Tiempos y opciones',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Desayuno y Bar – Tiempos y opciones\n` +
                `Categoria: amenities\n` +
                `Cuerpo:\n` +
                `- Desayuno: [[key: schedules.breakfast | default: (Horario a confirmar)]].\n` +
                `- Restaurante/Bar: [[key: amenities.schedules.restaurant | default: (Horario a confirmar)]].\n` +
                `- Room service: [[key: amenities.schedules.room_service | default: (Horario a confirmar)]].\n` +
                `- Notas adicionales: (Detalle a confirmar con recepción).\n` +
                `- Si room service no está habilitado por el momento, ofrecer alternativa y escalar a recepción.`,
        },
        {
            promptKey: 'breakfast_bar',
            title: 'Breakfast and Bar – Times and options',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Breakfast and Bar – Times and options\n` +
                `Category: amenities\n` +
                `Body:\n` +
                `- Breakfast: (schedule, place, type)\n` +
                `- Bar: (schedule, menu, room service)`,
        },
        {
            promptKey: 'breakfast_bar',
            title: 'Café da manhã e Bar – Horários e opções',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Café da manhã e Bar – Horários e opções\n` +
                `Categoria: amenities\n` +
                `Corpo:\n` +
                `- Café da manhã: (horário, local, tipo)\n` +
                `- Bar: (horário, cardápio, room service)`,
        },
        {
            promptKey: 'parking',
            title: 'Estacionamiento – Cupos y costos',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Estacionamiento – Cupos y costos\n` +
                `Categoria: amenities\n` +
                `Cuerpo:\n` +
                `- Disponibilidad/cupos: [[key: amenities.parkingNotes | default: (Disponibilidad a confirmar)]]\n` +
                `- Costo y reservas: [[key: amenities.parkingNotes | default: (Costo/condiciones a confirmar)]]\n` +
                `- Condiciones adicionales: (Detalle a confirmar con recepción).`,
        },
        {
            promptKey: 'parking',
            title: 'Parking – Spots and costs',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Parking – Spots and costs\n` +
                `Category: amenities\n` +
                `Body:\n` +
                `- Availability/spots\n` +
                `- Cost and reservations\n` +
                `- Max height/conditions`,
        },
        {
            promptKey: 'parking',
            title: 'Estacionamento – Vagas e custos',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Estacionamento – Vagas e custos\n` +
                `Categoria: amenities\n` +
                `Corpo:\n` +
                `- Disponibilidade/vagas\n` +
                `- Custo e reservas\n` +
                `- Altura máxima/condições`,
        },
    ],

    billing: [
        {
            promptKey: 'payments_and_billing',
            title: 'Medios de pago y facturación',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Pagos y facturación\n` +
                `Categoria: billing\n` +
                `Cuerpo:\n` +
                `- Medios de pago aceptados:\n` +
                `[[each: payments.methods | default: - (No definidos)\n` +
                ` -> - [[item]]]]\n` +
                `- Monedas:\n` +
                `[[each: payments.currencies | default: - (No definidas)\n` +
                ` -> - [[item]]]]\n` +
                `- Requiere tarjeta para reservar: [[key: payments.requiresCardForBooking | default: (No definido)]].\n` +
                `- Emite facturas: [[key: billing.issuesInvoices | default: (No definido)]].\n` +
                `- Tipos de comprobantes:\n` +
                `[[each: billing.invoiceNotesTags | default: - (Sin datos)\n` +
                ` -> - [[item]]]].`,
        },
        {
            promptKey: 'payments_and_billing',
            title: 'Payment methods and billing',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Payment methods and billing\n` +
                `Category: billing\n` +
                `Body:\n` +
                `- Accepted payment methods:\n` +
                `- Deposits/prepayments:\n` +
                `- Billing (required data, deadlines):\n` +
                `- Currency and exchange rate:`,
        },
        {
            promptKey: 'payments_and_billing',
            title: 'Meios de pagamento e faturamento',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Meios de pagamento e faturamento\n` +
                `Categoria: billing\n` +
                `Corpo:\n` +
                `- Meios de pagamento aceitos:\n` +
                `- Depósitos/pré-pagamentos:\n` +
                `- Faturamento (dados necessários, prazos):\n` +
                `- Moeda e taxa de câmbio:`,
        },
        {
            promptKey: 'invoice_receipts',
            title: 'Facturación – Facturas y recibos',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Facturación – Facturas y recibos\n` +
                `Categoria: billing\n` +
                `Cuerpo:\n` +
                `- Emite facturas: [[key: billing.issuesInvoices | default: (No definido)]].\n` +
                `- Datos/formatos aceptados:\n` +
                `[[each: billing.invoiceNotesTags | default: - (Sin datos)\n` +
                ` -> - [[item]]]]\n` +
                `- Notas de facturación: [[key: billing.invoiceNotes | default: (Sin notas)]].`,
        },
        {
            promptKey: 'invoice_receipts',
            title: 'Billing – Invoices and receipts',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Billing – Invoices and receipts\n` +
                `Category: billing\n` +
                `Body:\n` +
                `- Required data for invoice\n` +
                `- Currency and taxes\n` +
                `- Deadlines and issuance of receipts`,
        },
        {
            promptKey: 'invoice_receipts',
            title: 'Faturamento – Faturas e recibos',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Faturamento – Faturas e recibos\n` +
                `Categoria: billing\n` +
                `Corpo:\n` +
                `- Dados necessários para fatura\n` +
                `- Moeda e impostos\n` +
                `- Prazos e emissão de comprovantes`,
        },
    ],

    support: [
        {
            promptKey: 'contact_support',
            title: 'Contacto y soporte',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Contacto y soporte\n` +
                `Categoria: support\n` +
                `Cuerpo:\n` +
                `- Teléfono recepción: [[key: contacts.phone | default: (No definido)]].\n` +
                `- WhatsApp: [[key: contacts.whatsapp | default: (No definido)]].\n` +
                `- Email: [[key: contacts.email | default: (No definido)]].\n` +
                `- Horario de atención: [[key: contacts.supportHours | default: (Horario a confirmar)]].\n` +
                `- Escalamiento (guardia/nocturno): [[key: contacts.supportEscalation | default: (Guardia/alternativa a confirmar)]].\n` +
                `- Si una vía no está habilitada por el momento, ofrecer alternativa de contacto y escalar a recepción.`,
        },
        {
            promptKey: 'contact_support',
            title: 'Contact and support',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Contact and support\n` +
                `Category: support\n` +
                `Body:\n` +
                `- Reception phone: [[key: contacts.phone | default: (Not defined)]].\n` +
                `- WhatsApp: [[key: contacts.whatsapp | default: (Not defined)]].\n` +
                `- Email: [[key: contacts.email | default: (Not defined)]].\n` +
                `- Service hours: [[key: contacts.supportHours | default: (Not defined)]].\n` +
                `- Escalation (night guard): [[key: contacts.supportEscalation | default: (Not defined)]].`,
        },
        {
            promptKey: 'contact_support',
            title: 'Contato e suporte',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Contato e suporte\n` +
                `Categoria: support\n` +
                `Corpo:\n` +
                `- Telefone da recepção: [[key: contacts.phone | default: (Não definido)]].\n` +
                `- WhatsApp: [[key: contacts.whatsapp | default: (Não definido)]].\n` +
                `- Email: [[key: contacts.email | default: (Não definido)]].\n` +
                `- Horário de atendimento: [[key: contacts.supportHours | default: (Não definido)]].\n` +
                `- Escalonamento (plantão noturno): [[key: contacts.supportEscalation | default: (Não definido)]].`,
        },
        {
            promptKey: 'contact_channel_selector',
            title: 'Gestión de canal de contacto',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Gestión de canal de contacto\n` +
                `Categoria: support\n` +
                `Cuerpo:\n` +
                `- Canal consultado: [[key: runtime.channel | default: (No informado)]].\n` +
                `- Disponibilidad del canal: [[key: runtime.channelAvailability | default: (A confirmar)]].\n` +
                `- Política de escalamiento: [[key: runtime.escalationPolicy | default: (A confirmar)]].\n` +
                `- Acción sugerida: [[key: runtime.suggestedAction | default: Contactar por WhatsApp o teléfono de recepción.)]].\n`,
        },
        {
            promptKey: 'contact_channel_selector',
            title: 'Contact channel manager',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Contact channel manager\n` +
                `Category: support\n` +
                `Body:\n` +
                `- Requested channel: [[key: runtime.channel | default: (Not provided)]].\n` +
                `- Channel availability: [[key: runtime.channelAvailability | default: (To be confirmed)]].\n` +
                `- Escalation policy: [[key: runtime.escalationPolicy | default: (To be confirmed)]].\n` +
                `- Suggested action: [[key: runtime.suggestedAction | default: Contact via WhatsApp or reception phone.)]].\n`,
        },
        {
            promptKey: 'contact_channel_selector',
            title: 'Gestão de canal de contato',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Gestão de canal de contato\n` +
                `Categoria: support\n` +
                `Corpo:\n` +
                `- Canal consultado: [[key: runtime.channel | default: (Não informado)]].\n` +
                `- Disponibilidade do canal: [[key: runtime.channelAvailability | default: (A confirmar)]].\n` +
                `- Política de escalonamento: [[key: runtime.escalationPolicy | default: (A confirmar)]].\n` +
                `- Ação sugerida: [[key: runtime.suggestedAction | default: Contatar por WhatsApp ou telefone da recepção.)]].\n`,
        },
    ],

    cancel_reservation: [
        {
            promptKey: 'cancellation_policy',
            title: 'Política de cancelación',
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Política de cancelación\n` +
                `Categoria: cancel_reservation\n` +
                `Cuerpo:\n` +
                `- Ventana de cancelación sin cargo: [[key: policies.cancellation.flexible | default: (No definida)]].\n` +
                `- Penalidad no reembolsable / fuera de término: [[key: policies.cancellation.nonRefundable | default: (No definida)]].\n` +
                `- No-show: [[key: policies.cancellation.noShow | default: (No definido)]].\n` +
                `- Canales de cancelación:\n` +
                `[[each: policies.cancellation.channels | default: - (No definidos)\n` +
                ` -> - [[item]]]]`,
        },
        {
            promptKey: 'cancellation_policy',
            title: 'Cancellation policy',
            type: 'standard',
            lang: 'en',
            body:
                `Title: Cancellation policy\n` +
                `Category: cancel_reservation\n` +
                `Body:\n` +
                `- Free cancellation window\n` +
                `- Penalties for no show or late cancellation\n` +
                `- Modification/cancellation channels`,
        },
        {
            promptKey: 'cancellation_policy',
            title: 'Política de cancelamento',
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Política de cancelamento\n` +
                `Categoria: cancel_reservation\n` +
                `Corpo:\n` +
                `- Janela de cancelamento sem custo\n` +
                `- Penalidades por no show ou fora do prazo\n` +
                `- Canais de modificação/cancelamento`,
        },
    ],

    reservation_snapshot: [
        {
            promptKey: 'reservation_snapshot',
            title: 'Snapshot de reserva – Contenido',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Snapshot de reserva – Contenido\n` +
                `Categoria: reservation_snapshot\n` +
                `Cuerpo:\n` +
                `- Campos mínimos: código/id, check-in, check-out, habitación, huéspedes, nombre del huésped.\n` +
                `- Formato sugerido: lista clara en bullets y orden fijo.\n` +
                `- Si falta un campo, mostrar "(sin dato)" en vez de omitirlo.`,
        },
        {
            promptKey: 'reservation_snapshot',
            title: 'Reservation snapshot – Content',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Reservation snapshot – Content\n` +
                `Category: reservation_snapshot\n` +
                `Body:\n` +
                `- Included fields: id, dates, room, guests\n` +
                `- Format and visibility`,
        },
        {
            promptKey: 'reservation_snapshot',
            title: 'Snapshot de reserva – Conteúdo',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Snapshot de reserva – Conteúdo\n` +
                `Categoria: reservation_snapshot\n` +
                `Corpo:\n` +
                `- Campos incluídos: id, datas, quarto, hóspedes\n` +
                `- Formato e visibilidade`,
        },
    ],

    reservation_verify: [
        {
            promptKey: 'reservation_verify',
            title: 'Verificación de reserva – Reglas',
            type: 'playbook',
            lang: 'es',
            body:
                `Titulo: Verificación de reserva – Reglas\n` +
                `Categoria: reservation_verify\n` +
                `Cuerpo:\n` +
                `- Verificar consistencia: check-out > check-in, fechas válidas, huéspedes <= capacidad.\n` +
                `- Verificar coherencia del cambio (si modifica fechas o habitación).\n` +
                `- Confirmaciones requeridas: aceptación explícita del resumen final antes de aplicar.`,
        },
        {
            promptKey: 'reservation_verify',
            title: 'Reservation verification – Rules',
            type: 'playbook',
            lang: 'en',
            body:
                `Title: Reservation verification – Rules\n` +
                `Category: reservation_verify\n` +
                `Body:\n` +
                `- Date and capacity consistency\n` +
                `- Required confirmations`,
        },
        {
            promptKey: 'reservation_verify',
            title: 'Verificação de reserva – Regras',
            type: 'playbook',
            lang: 'pt',
            body:
                `Título: Verificação de reserva – Regras\n` +
                `Categoria: reservation_verify\n` +
                `Corpo:\n` +
                `- Consistência de datas e capacidades\n` +
                `- Confirmações requeridas`,
        },
    ],
};

// ==================== Índice por (category, promptKey, lang) ====================

type IndexKey = `${Exclude<Category, 'other'>}:${string}:${Lang}`;

const makeKey = (category: Exclude<Category, 'other'>, promptKey: string, lang: Lang): IndexKey =>
    `${category}:${promptKey}:${lang}`;

export type TemplateIndex = Map<IndexKey, TemplateEntry>;

/**
 * Construye un índice O(1) para búsquedas por (category, promptKey, lang).
 * Útil para seeds, prefetch o validaciones rápidas.
 */
export function buildTemplateIndex(source: TemplatesByCategory = templates): TemplateIndex {
    const idx: TemplateIndex = new Map();
    (Object.keys(source) as Array<keyof TemplatesByCategory>).forEach((cat) => {
        const entries = source[cat] || [];
        entries.forEach((tpl) => {
            const k = makeKey(cat, tpl.promptKey, tpl.lang);
            idx.set(k, tpl);
        });
    });
    return idx;
}

/** Índice preconstruido (puede recalcularse si hacés hot-reload de templates) */
export const templateIndex: TemplateIndex = buildTemplateIndex();

/** Recupera una plantilla en O(1). Retorna undefined si no existe. */
export function getTemplate(
    category: Exclude<Category, 'other'>,
    promptKey: string,
    lang: Lang
): TemplateEntry | undefined {
    return templateIndex.get(makeKey(category, promptKey, lang));
}

/** Lista todas las plantillas que cumplan filtros opcionales. */
export function listTemplatesBy(
    filters: Partial<{ category: Exclude<Category, 'other'>; promptKey: string; lang: Lang }>
): TemplateEntry[] {
    const items: TemplateEntry[] = [];
    templateIndex.forEach((value, key) => {
        const [cat, pKey, language] = key.split(':') as [Exclude<Category, 'other'>, string, Lang];
        if (filters.category && cat !== filters.category) return;
        if (filters.promptKey && pKey !== filters.promptKey) return;
        if (filters.lang && language !== filters.lang) return;
        items.push(value);
    });
    return items;
}

/** Chequeo rápido de existencia. */
export function hasTemplate(
    category: Exclude<Category, 'other'>,
    promptKey: string,
    lang: Lang
): boolean {
    return templateIndex.has(makeKey(category, promptKey, lang));
}

/**
 * Upsert sólo en memoria (útil para tests, seeds o prototipos).
 * Si querés persistir, usá tu capa de DB (hotel_content) y luego reconstruí el índice.
 */
export function upsertTemplateInMemory(entry: TemplateEntry, category: Exclude<Category, 'other'>): void {
    // Actualiza la estructura por categoría
    const list = templates[category] || [];
    const i = list.findIndex((e) => e.promptKey === entry.promptKey && e.lang === entry.lang);
    if (i >= 0) list[i] = entry;
    else list.push(entry);
    templates[category] = list;

    // Actualiza el índice
    templateIndex.set(makeKey(category, entry.promptKey, entry.lang), entry);
}

/** Helper: devuelve el nombre del nodo del grafo para una categoría */
export function getGraphNodeForCategory(category: Category): string {
    return GRAPH_CATEGORY_TO_NODE[category];
}
