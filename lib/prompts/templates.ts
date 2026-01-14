// Path: /home/marcelo/begasist/lib/prompts/templates.ts

// ==================== Tipos base del contrato ====================
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

export type TemplateType = 'playbook' | 'standard';

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
    retrieval_based: ['kb_general', 'room_info', 'room_info_img', 'ambiguity_policy', 'arrivals_transport'],
    reservation: ['reservation_flow', 'modify_reservation'],
    reservation_snapshot: ['reservation_snapshot'],
    reservation_verify: ['reservation_verify'],
    cancel_reservation: ['cancellation_policy'],
    amenities: ['amenities_list', 'pool_gym_spa', 'breakfast_bar', 'parking'],
    billing: ['payments_and_billing', 'invoice_receipts'],
    support: ['contact_support'],
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
    if (rec.type !== 'playbook' && rec.type !== 'standard') {
        return { ok: false, error: `type inválido: ${rec.type}. Debe ser 'playbook' | 'standard'` };
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
            type: 'standard',
            lang: 'es',
            body:
                `Titulo: Tipos de habitaciones – con iconos e imágenes\n` +
                `Categoria: retrieval_based\n` +
                `Resumen: Descripción breve por tipo con icono/emoji y carrusel de imágenes (URLs).\n` +
                `Cuerpo (por cada tipo):\n` +
                `- Tipo: (ej.: Doble Superior)\n` +
                `- Icono: (ej.: 🛏️✨)\n` +
                `- Highlights: (3-5 bullets cortos)\n` +
                `- Images: [url1, url2, url3...]\n` +
                `Notas:\n` +
                `- Preferir URLs públicas optimizadas; 1200x800 aprox.\n` +
                `- Mantener 3-6 imágenes por tipo.`,
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
            type: 'standard',
            lang: 'en',
            body:
                `Title: Room types – with icons and images\n` +
                `Category: retrieval_based\n` +
                `Summary: Brief description per type with icon/emoji and image carousel (URLs).\n` +
                `Body (per type):\n` +
                `- Type: (e.g.: Superior Double)\n` +
                `- Icon: (e.g.: 🛏️✨)\n` +
                `- Highlights: (3-5 short bullets)\n` +
                `- Images: [url1, url2, url3...]\n` +
                `Notes:\n` +
                `- Prefer public optimized URLs; approx. 1200x800\n` +
                `- Keep 3-6 images per type.`,
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
            type: 'standard',
            lang: 'pt',
            body:
                `Título: Tipos de quartos – com ícones e imagens\n` +
                `Categoria: retrieval_based\n` +
                `Resumo: Descrição breve por tipo com ícone/emoji e carrossel de imagens (URLs).\n` +
                `Corpo (por tipo):\n` +
                `- Tipo: (ex.: Duplo Superior)\n` +
                `- Ícone: (ex.: 🛏️✨)\n` +
                `- Destaques: (3-5 bullets curtos)\n` +
                `- Imagens: [url1, url2, url3...]\n` +
                `Notas:\n` +
                `- Preferir URLs públicas otimizadas; aprox. 1200x800\n` +
                `- Manter 3-6 imagens por tipo.`,
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
            body: '¿Necesitas que te ayudemos a coordinar tu transporte desde el aeropuerto o terminal? Por favor indícanos tu preferencia.',
            type: 'standard',
            lang: 'es',
        },
        {
            promptKey: 'arrivals_transport',
            title: 'Arrival transport',
            body: 'Do you need help arranging your transport from the airport or station? Please let us know your preference.',
            type: 'standard',
            lang: 'en',
        },
        {
            promptKey: 'arrivals_transport',
            title: 'Transporte de chegada',
            body: 'Precisa de ajuda para organizar seu transporte do aeroporto ou terminal? Por favor, indique sua preferência.',
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
                `- Datos requeridos: nombre completo, tipo de habitación, check-in, check-out, huéspedes\n` +
                `- Orden sugerido de preguntas:\n` +
                `- Reglas/validaciones (fechas válidas, capacidad por habitación):`,
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
                `- Campos modificables: fechas, nombre, habitación, huéspedes\n` +
                `- Confirmación de cambios y snapshot:`,
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
                `- Si hay ambigüedad, listar opciones claras y pedir confirmación.`,
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
                `- Si no cumple, explicar el motivo y pedir un valor válido.`,
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
                `- Indicar que puede modificar otro campo o finalizar.`,
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
                `- Desayuno: (horario, lugar)\n` +
                `- Piscina: (horario, temporada)\n` +
                `- Gimnasio/Spa: (horario, requisitos)\n` +
                `- Estacionamiento: (costo, cupos, reservas)\n` +
                `- Mascotas: (permitidas/no, condiciones)`,
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
                `- Breakfast: (schedule, place)\n` +
                `- Pool: (schedule, season)\n` +
                `- Gym/Spa: (schedule, requirements)\n` +
                `- Parking: (cost, spots, reservations)\n` +
                `- Pets: (allowed/not, conditions)`,
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
                `- Café da manhã: (horário, local)\n` +
                `- Piscina: (horário, temporada)\n` +
                `- Academia/Spa: (horário, requisitos)\n` +
                `- Estacionamento: (custo, vagas, reservas)\n` +
                `- Animais: (permitidos/não, condições)`,
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
                `- Piscina: (horario, temporada, toallas)\n` +
                `- Gimnasio: (horario, requisitos)\n` +
                `- Spa: (servicios, reservas, costo)`,
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
                `- Desayuno: (horario, lugar, tipo)\n` +
                `- Bar: (horario, carta, room service)`,
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
                `- Disponibilidad/cupos\n` +
                `- Costo y reservas\n` +
                `- Altura máxima/condiciones`,
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
                `- Depósitos/prepagos:\n` +
                `- Facturación (datos requeridos, plazos):\n` +
                `- Moneda y tipo de cambio:`,
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
                `- Datos necesarios para factura\n` +
                `- Moneda e impuestos\n` +
                `- Plazos y emisión de comprobantes`,
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
                `- Teléfono recepción:\n` +
                `- Whatsapp/Email:\n` +
                `- Horario de atención:\n` +
                `- Escalamiento (guardia/nocturno):`,
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
                `- Reception phone:\n` +
                `- Whatsapp/Email:\n` +
                `- Service hours:\n` +
                `- Escalation (night guard):`,
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
                `- Telefone da recepção:\n` +
                `- Whatsapp/Email:\n` +
                `- Horário de atendimento:\n` +
                `- Escalonamento (plantão noturno):`,
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
                `- Ventana de cancelación sin cargo\n` +
                `- Penalidades por no show o fuera de término\n` +
                `- Canales de modificación/cancelación`,
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
                `- Campos incluidos: id, fechas, habitación, huéspedes\n` +
                `- Formato y visibilidad`,
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
                `- Consistencia de fechas y capacidades\n` +
                `- Confirmaciones requeridas`,
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
