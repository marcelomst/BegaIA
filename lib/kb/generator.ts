// lib/kb/generator.ts
// Convierte un perfil de hotel en archivos de KB listos para ingesta, siguiendo el contrato
// category/promptKey.lang.txt

export type Lang = 'es' | 'en' | 'pt';

// Taxonomía de amenities: normalización y etiquetas
import { normalizeAmenityTags, amenityLabel } from '../taxonomy/amenities';
import { templates } from '../prompts/templates';
import { hydrateTextFromConfig } from './hydrateFromConfig';

// Perfil usado por el generador (subset/mapeo tolerante del nuevo HotelConfig)
export interface Profile {
  hotelId: string;
  hotelName?: string;
  defaultLanguage: Lang;
  timezone?: string;
  location?: { address?: string; city?: string; country?: string; coordinates?: { lat: number; lng: number } };
  contacts?: { email?: string; phone?: string; whatsapp?: string; website?: string };
  schedules?: { checkIn?: string; checkOut?: string; breakfast?: string; quietHours?: string;[k: string]: any };
  amenities?: {
    tags?: string[];
    schedules?: Record<string, string>; // amenity -> horario ("HH:mm" o "HH:mm a HH:mm")
    notes?: string;
    parkingNotes?: string;
    // Legacy (tolerado para migración, se normaliza si viene)
    hasParking?: boolean; hasPool?: boolean; hasGym?: boolean; hasSpa?: boolean;
    poolSchedule?: string; gymSchedule?: string; spaSchedule?: string; other?: string[];
  };
  payments?: { methods?: string[]; notes?: string; notesTags?: string[]; requiresCardForBooking?: boolean; currency?: string; currencies?: string[] };
  billing?: { issuesInvoices?: boolean; invoiceNotes?: string; invoiceNotesTags?: string[] };
  policies?: { pets?: string; smoking?: string; generalTags?: string[]; cancellation?: any };
  airports?: Array<{ code?: string; name?: string; distanceKm?: number; driveTime?: string }>;
  transport?: { hasPrivateTransfer?: boolean; transferNotes?: string; taxiNotes?: string; busNotes?: string };
  attractions?: Array<{ name?: string; distanceKm?: number; notes?: string }>;
  rooms?: Array<{ name?: string; type?: string; capacity?: number; bed?: string; sizeSqm?: number; view?: string; amenities?: string[]; images?: string[] }>;
  hotelProfile?: {
    shortDescription?: string;
    style?: string;
    starRating?: number;
    propertyType?: string;
    brand?: string;
  };
}

export function buildHydrationConfigFromProfile(p: Profile): Record<string, any> {
  const address = p.location?.address || '';
  const city = p.location?.city || '';
  const country = p.location?.country || '';
  return {
    hotelId: p.hotelId,
    hotelName: p.hotelName,
    defaultLanguage: p.defaultLanguage,
    timezone: p.timezone,
    address,
    city,
    country,
    location: p.location,
    contacts: p.contacts,
    schedules: p.schedules,
    amenities: p.amenities,
    payments: p.payments,
    billing: p.billing,
    policies: p.policies,
    airports: p.airports,
    transport: p.transport,
    attractions: p.attractions,
    rooms: p.rooms,
    hotelProfile: p.hotelProfile,
  };
}

function normalizeRoomImageUrl(raw: unknown): string {
  const normalize = (value: string) => {
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const publicIndex = trimmed.lastIndexOf("/public/");
    if (publicIndex >= 0) {
      const publicPath = trimmed.slice(publicIndex + "/public".length);
      return publicPath.startsWith("/") ? publicPath : `/${publicPath}`;
    }
    return trimmed;
  };
  if (typeof raw === "string") return normalize(raw);
  if (raw && typeof raw === "object" && typeof (raw as { url?: unknown }).url === "string") {
    return normalize(String((raw as { url: string }).url || ""));
  }
  return "";
}

function isRenderableRoomImageUrl(url: string): boolean {
  return /^https?:\/\//i.test(url) || /^\/hotel[a-z0-9_-]+\//i.test(url);
}

function normalizeRoomImagesForTemplates(cfg: any): any {
  if (!Array.isArray(cfg?.rooms)) return cfg;
  return {
    ...cfg,
    rooms: cfg.rooms.map((room: any) => {
      const images = Array.isArray(room?.images)
        ? room.images
            .map(normalizeRoomImageUrl)
            .filter(isRenderableRoomImageUrl)
            .slice(0, 8)
        : room?.images;
      return { ...room, images };
    }),
  };
}

export function generateKbFilesFromTemplates(args: {
  hotelConfig: any;
  defaultLanguage?: Lang;
}): Record<string, string> {
  const lang = (args.defaultLanguage || args.hotelConfig?.defaultLanguage || 'es') as Lang;
  const files: Record<string, string> = {};
  const cfg = normalizeRoomImagesForTemplates(args.hotelConfig || {});

  for (const [category, entries] of Object.entries(templates)) {
    for (const entry of entries) {
      if (entry.lang !== lang) continue;
      const body = hydrateTextFromConfig(entry.body || '', cfg);
      const rel = `${category}/${entry.promptKey}.${entry.lang}.txt`;
      files[rel] = body;
    }
  }
  return files;
}

function t(lang: Lang) {
  if (lang === 'en') return {
    general: 'General hotel information',
    category: 'Category',
    retrieval_based: 'retrieval_based',
    amenities: 'amenities',
    billing: 'billing',
    support: 'support',
    reservation: 'reservation',
    reservation_snapshot: 'reservation_snapshot',
    reservation_verify: 'reservation_verify',
    cancel_reservation: 'cancel_reservation',
    address: 'Address', city: 'City', country: 'Country', website: 'Website',
    roomsTitle: 'Room types – summary', typeLabel: 'Type', capacity: 'Capacity', bed: 'Bed', size: 'Size (sqm)', view: 'View', amenitiesLabel: 'Amenities',
    arrivalsTransport: 'Arrival transport', airports: 'Nearby airports', distance: 'Distance (km)', driveTime: 'Drive time', privateTransfer: 'Private transfer', taxi: 'Taxi', bus: 'Bus',
    amenitiesList: 'Amenities and schedules', breakfast: 'Breakfast', pool: 'Pool', gymSpa: 'Gym/Spa', parking: 'Parking', pets: 'Pets', otherAmenities: 'Other amenities',
    paymentsBilling: 'Payment methods and billing', invoiceReceipts: 'Billing – Invoices and receipts',
    contactSupport: 'Contact and support', phone: 'Phone', whatsapp: 'Whatsapp', email: 'Email', hours: 'Hours',
    cancellationPolicy: 'Cancellation policy',
    reservationFlow: 'Reservation flow – Required data',
    modifyReservation: 'Modify reservation – Field and new value',
    reservationSnapshot: 'Reservation snapshot – Content',
    reservationVerify: 'Reservation verification – Rules',
    // Structured cancellation labels
    cancelFlexible: 'Flexible',
    cancelNonRefundable: 'Non refundable',
    cancelChannels: 'Channels',
    cancelNoShow: 'No-show',
    // Payments/Billing labels
    payMethods: 'Payment methods',
    payCurrencies: 'Currencies',
    payRequiresCard: 'Requires card to book',
    payNotes: 'Payment notes',
    payNotesTags: 'Payment notes tags',
    billIssuesInvoices: 'Issues invoices',
    billInvoiceNotes: 'Invoice notes',
    billInvoiceNotesTags: 'Invoice notes tags',
    // Support / schedules
    scheduleCheckIn: 'Check-in',
    scheduleCheckOut: 'Check-out',
    scheduleBreakfast: 'Breakfast',
    scheduleQuietHours: 'Quiet hours',
  } as const;
  if (lang === 'pt') return {
    general: 'Informações gerais do hotel',
    category: 'Categoria',
    retrieval_based: 'retrieval_based',
    amenities: 'amenities',
    billing: 'billing',
    support: 'support',
    reservation: 'reservation',
    reservation_snapshot: 'reservation_snapshot',
    reservation_verify: 'reservation_verify',
    cancel_reservation: 'cancel_reservation',
    address: 'Endereço', city: 'Cidade', country: 'País', website: 'Site',
    roomsTitle: 'Tipos de quartos – resumo', typeLabel: 'Tipo', capacity: 'Capacidade', bed: 'Cama', size: 'Tamanho (m²)', view: 'Vista', amenitiesLabel: 'Comodidades',
    arrivalsTransport: 'Transporte de chegada', airports: 'Aeroportos próximos', distance: 'Distância (km)', driveTime: 'Tempo de viagem', privateTransfer: 'Transfer privado', taxi: 'Táxi', bus: 'Ônibus',
    amenitiesList: 'Amenities e horários', breakfast: 'Café da manhã', pool: 'Piscina', gymSpa: 'Academia/Spa', parking: 'Estacionamento', pets: 'Animais', otherAmenities: 'Outras comodidades',
    paymentsBilling: 'Meios de pagamento e faturamento', invoiceReceipts: 'Faturamento – Faturas e recibos',
    contactSupport: 'Contato e suporte', phone: 'Telefone', whatsapp: 'Whatsapp', email: 'Email', hours: 'Horário',
    cancellationPolicy: 'Política de cancelamento',
    reservationFlow: 'Fluxo de reserva – Dados necessários',
    modifyReservation: 'Modificar reserva – Campo e novo valor',
    reservationSnapshot: 'Snapshot de reserva – Conteúdo',
    reservationVerify: 'Verificação de reserva – Regras',
    cancelFlexible: 'Flexível',
    cancelNonRefundable: 'Não reembolsável',
    cancelChannels: 'Canais',
    cancelNoShow: 'No-show',
    payMethods: 'Métodos de pagamento',
    payCurrencies: 'Moedas',
    payRequiresCard: 'Requer cartão para reservar',
    payNotes: 'Notas de pagamento',
    payNotesTags: 'Tags de notas de pagamento',
    billIssuesInvoices: 'Emite faturas',
    billInvoiceNotes: 'Notas da fatura',
    billInvoiceNotesTags: 'Tags de notas da fatura',
    scheduleCheckIn: 'Check-in',
    scheduleCheckOut: 'Check-out',
    scheduleBreakfast: 'Café da manhã',
    scheduleQuietHours: 'Horário de silêncio',
  } as const;
  return {
    general: 'Información general del hotel',
    category: 'Categoria',
    retrieval_based: 'retrieval_based',
    amenities: 'amenities',
    billing: 'billing',
    support: 'support',
    reservation: 'reservation',
    reservation_snapshot: 'reservation_snapshot',
    reservation_verify: 'reservation_verify',
    cancel_reservation: 'cancel_reservation',
    address: 'Dirección', city: 'Ciudad', country: 'País', website: 'Sitio web',
    roomsTitle: 'Tipos de habitaciones – resumen', typeLabel: 'Tipo', capacity: 'Capacidad', bed: 'Cama', size: 'Tamaño (m²)', view: 'Vista', amenitiesLabel: 'Amenities',
    arrivalsTransport: 'Transporte de llegada', airports: 'Aeropuertos cercanos', distance: 'Distancia (km)', driveTime: 'Tiempo de viaje', privateTransfer: 'Transfer privado', taxi: 'Taxi', bus: 'Bus',
    amenitiesList: 'Amenities y horarios', breakfast: 'Desayuno', pool: 'Piscina', gymSpa: 'Gimnasio/Spa', parking: 'Estacionamiento', pets: 'Mascotas', otherAmenities: 'Otros amenities',
    paymentsBilling: 'Pagos y facturación', invoiceReceipts: 'Facturación – Facturas y recibos',
    contactSupport: 'Contacto y soporte', phone: 'Teléfono', whatsapp: 'Whatsapp', email: 'Email', hours: 'Horario',
    cancellationPolicy: 'Política de cancelación',
    reservationFlow: 'Flujo de reserva – Datos necesarios',
    modifyReservation: 'Modificar reserva – Campo y nuevo valor',
    reservationSnapshot: 'Snapshot de reserva – Contenido',
    reservationVerify: 'Verificación de reserva – Reglas',
    cancelFlexible: 'Flexible',
    cancelNonRefundable: 'No reembolsable',
    cancelChannels: 'Canales',
    cancelNoShow: 'No-show',
    payMethods: 'Métodos de pago',
    payCurrencies: 'Monedas',
    payRequiresCard: 'Requiere tarjeta para reservar',
    payNotes: 'Notas de pago',
    payNotesTags: 'Tags de notas de pago',
    billIssuesInvoices: 'Emite facturas',
    billInvoiceNotes: 'Notas de factura',
    billInvoiceNotesTags: 'Tags de notas de factura',
    scheduleCheckIn: 'Check-in',
    scheduleCheckOut: 'Check-out',
    scheduleBreakfast: 'Desayuno',
    scheduleQuietHours: 'Horas de silencio',
  } as const;
}

function h1(title: string) { return `# ${title}\n\n`; }
function section(label: string, value?: string) {
  return value ? `- ${label}: ${value}\n` : `- ${label}:\n`;
}

export function generateKbFilesFromProfile(p: Profile): Record<string, string> {
  const lang = (p.defaultLanguage || 'es') as Lang;
  const L = t(lang);
  const files: Record<string, string> = {};

  // Normaliza país a nombre cuando vienen códigos (UY, AR, BR, US, ES, PT, MX, CL, UY…)
  const countryMap: Record<string, string> = {
    ar: 'Argentina', br: 'Brasil', cl: 'Chile', uy: 'Uruguay', py: 'Paraguay',
    pe: 'Perú', bo: 'Bolivia', mx: 'México', co: 'Colombia',
    es: 'España', pt: 'Portugal', us: 'Estados Unidos', uk: 'Reino Unido',
    fr: 'Francia', it: 'Italia', de: 'Alemania',
  };
  // Normalización robusta de dirección: evitar errores si faltan campos
  const safeStr = (v: any): string => {
    if (v == null) return '';
    try { return typeof v === 'string' ? v.trim() : String(v).trim(); } catch { return ''; }
  };
  const countryRaw = safeStr(p.location?.country || '');
  const countryNorm = countryRaw && countryRaw.length <= 3 ? (countryMap[countryRaw.toLowerCase()] || countryRaw) : countryRaw;
  const addrParts = [safeStr(p.location?.address), safeStr(p.location?.city), safeStr(countryNorm)].filter(Boolean);
  const addr = addrParts.join(', ');
  const gen =
    h1(L.general) +
    `${L.category}: ${L.retrieval_based}\n\n` +
    section('Hotel', p.hotelName) +
    section(L.address, addr) +
    section(L.website, p.contacts?.website) +
    '\n';
  files[`retrieval_based/kb_general.${lang}.txt`] = gen;

  // Room info
  let roomsBody = h1(L.roomsTitle) + `${L.category}: ${L.retrieval_based}\n\n`;
  if (Array.isArray(p.rooms) && p.rooms.length) {
    for (const r of p.rooms) {
      const name = r.name || r.type || '';
      roomsBody += `- ${L.typeLabel}: ${name}\n`;
      if (r.capacity) roomsBody += `  - ${L.capacity}: ${r.capacity}\n`;
      if (r.bed) roomsBody += `  - ${L.bed}: ${r.bed}\n`;
      if (typeof r.sizeSqm === 'number') roomsBody += `  - ${L.size}: ${r.sizeSqm}\n`;
      if (r.view) roomsBody += `  - ${L.view}: ${r.view}\n`;
      if (r.amenities?.length) roomsBody += `  - ${L.amenitiesLabel}: ${r.amenities.join(', ')}\n`;
    }
  } else {
    roomsBody += `- ${L.typeLabel}: \n  - ${L.capacity}: \n  - ${L.amenitiesLabel}: \n`;
  }
  files[`retrieval_based/room_info.${lang}.txt`] = roomsBody;

  // Room info con imágenes (para payload rico room_info_img)
  // Formato parseado por retrieval_based.ts: bloques separados por líneas en blanco
  // Campos: Tipo:, Icono:, Highlights:, Images:
  let roomsImgBody = h1(L.roomsTitle + " + imágenes") + `${L.category}: ${L.retrieval_based}\n\n`;
  if (Array.isArray(p.rooms) && p.rooms.length) {
    for (const r of p.rooms) {
      const name = r.name || r.type || '';
      roomsImgBody += `Tipo: ${name}\n`;
      // Icono heurístico mínimo según amenities o tipo
      const icon = r.type?.toLowerCase().includes('suite') ? '🛋️' : '🛏️';
      roomsImgBody += `Icono: ${icon}\n`;
      const highlights: string[] = [];
      if (r.view) highlights.push(`Vista: ${r.view}`);
      if (r.capacity) highlights.push(`Capacidad: ${r.capacity}`);
      if (r.bed) highlights.push(`Cama: ${r.bed}`);
      if (r.amenities?.length) highlights.push(...r.amenities.slice(0, 6));
      if (highlights.length) roomsImgBody += `Highlights: ${highlights.join(' | ')}\n`;
      if (Array.isArray(r.images) && r.images.length) {
        // El parser acepta JSON array o lista separada por comas; usamos JSON para fiabilidad.
        const safeImages = r.images
          .map(normalizeRoomImageUrl)
          .filter(isRenderableRoomImageUrl)
          .slice(0, 8);
        if (safeImages.length) roomsImgBody += `Images: ${JSON.stringify(safeImages)}\n`;
      }
      roomsImgBody += `\n`; // separador de bloque
    }
  } else {
    roomsImgBody += `Tipo: \nIcono: 🛏️\nHighlights: \nImages: []\n`;
  }
  files[`retrieval_based/room_info_img.${lang}.txt`] = roomsImgBody;

  // Arrivals/transport
  let arrBody = h1(L.arrivalsTransport) + `${L.category}: ${L.retrieval_based}\n\n`;
  if (p.airports?.length) {
    arrBody += `## ${L.airports}\n`;
    for (const a of p.airports) {
      arrBody += `- ${a.code ? `${a.code} – ` : ''}${a.name || ''}\n`;
      if (a.distanceKm) arrBody += `  - ${L.distance}: ${a.distanceKm}\n`;
      if (a.driveTime) arrBody += `  - ${L.driveTime}: ${a.driveTime}\n`;
    }
    arrBody += '\n';
  }
  if (p.transport) {
    arrBody += `- ${L.privateTransfer}: ${p.transport.hasPrivateTransfer ? 'sí' : 'no'}\n`;
    if (p.transport.transferNotes) arrBody += `  - Notes: ${p.transport.transferNotes}\n`;
    if (p.transport.taxiNotes) arrBody += `- ${L.taxi}: ${p.transport.taxiNotes}\n`;
    if (p.transport.busNotes) arrBody += `- ${L.bus}: ${p.transport.busNotes}\n`;
  }
  files[`retrieval_based/arrivals_transport.${lang}.txt`] = arrBody;

  // Amenities list (modelo tags + schedules con normalización y localización)
  let amBody = h1(L.amenitiesList) + `${L.category}: ${L.amenities}\n\n`;
  let tagsCanonical: string[] = Array.isArray(p.amenities?.tags) ? [...(p.amenities!.tags!)] : [];
  // Migración rápida desde legacy si todavía vienen flags
  // Migración de flags legacy -> slugs
  const legacyFlags: Array<[boolean | undefined, string]> = [
    [p.amenities?.hasPool, 'pool'],
    [p.amenities?.hasGym, 'gym'],
    [p.amenities?.hasSpa, 'spa'],
    [p.amenities?.hasParking, 'parking'],
  ];
  for (const [flag, slug] of legacyFlags) if (flag && !tagsCanonical.includes(slug)) tagsCanonical.push(slug);
  // Normalizar "other" (valores libres) a slugs custom
  if (Array.isArray(p.amenities?.other)) {
    const normalizedOther = normalizeAmenityTags(p.amenities!.other!.filter(Boolean) as string[]);
    for (const s of normalizedOther) if (!tagsCanonical.includes(s)) tagsCanonical.push(s);
  }
  tagsCanonical = Array.from(new Set(tagsCanonical));
  // Normalizar horarios: convertir claves potencialmente localizadas a slug
  const amenitySchedulesRaw: Record<string, string> = { ...(p.amenities?.schedules || {}) };
  const amenitySchedules: Record<string, string> = {};
  for (const [k, v] of Object.entries(amenitySchedulesRaw)) {
    if (!v) continue;
    const slug = normalizeAmenityTags([k])[0] || k;
    amenitySchedules[slug] = v;
  }
  if (p.amenities?.poolSchedule && !amenitySchedules['pool']) amenitySchedules['pool'] = p.amenities.poolSchedule;
  if (p.amenities?.gymSchedule && !amenitySchedules['gym']) amenitySchedules['gym'] = p.amenities.gymSchedule;
  if (p.amenities?.spaSchedule && !amenitySchedules['spa']) amenitySchedules['spa'] = p.amenities.spaSchedule;
  // Asegurar clave vacía para cada tag sin horario (para edición futura si se consume este archivo)
  for (const slug of tagsCanonical) if (!(slug in amenitySchedules)) amenitySchedules[slug] = '';
  const localizedTags = tagsCanonical.map(slug => amenityLabel(slug, lang));
  const breakfastVal = p.schedules?.breakfast || '';
  const petsVal = p.policies?.pets || '';
  amBody += `- Tags: ${localizedTags.join(', ')}\n`;
  amBody += `- ${L.scheduleBreakfast}: ${breakfastVal}\n`;
  if (p.amenities?.parkingNotes) amBody += `- ${L.parking} notas: ${p.amenities.parkingNotes}\n`;
  if (p.amenities?.notes) amBody += `- Notas: ${p.amenities.notes}\n`;
  amBody += `- ${L.pets}: ${petsVal}\n`;
  const scheduleEntries = Object.entries(amenitySchedules).filter(([, v]) => v);
  if (scheduleEntries.length) {
    amBody += `\n## Horarios\n`;
    for (const [slug, sched] of scheduleEntries) {
      amBody += `- ${amenityLabel(slug, lang)}: ${sched}\n`;
    }
  }
  files[`amenities/amenities_list.${lang}.txt`] = amBody;

  // Billing & Payments enriquecidos
  const pay = p.payments || {};
  const bill = p.billing || {};
  const currencies = (pay.currencies && pay.currencies.length ? pay.currencies : (pay.currency ? [pay.currency] : [])).join(', ');
  let payBody = h1(L.paymentsBilling) + `${L.category}: ${L.billing}\n\n`;
  payBody += `- ${L.payMethods}: ${(pay.methods && pay.methods.length) ? pay.methods.join(', ') : ''}\n`;
  payBody += `- ${L.payCurrencies}: ${currencies}\n`;
  payBody += `- ${L.payRequiresCard}: ${pay.requiresCardForBooking ? 'sí' : 'no'}\n`;
  if (pay.notes) payBody += `- ${L.payNotes}: ${pay.notes}\n`;
  if (pay.notesTags?.length) payBody += `- ${L.payNotesTags}: ${pay.notesTags.join(', ')}\n`;
  payBody += `- ${L.billIssuesInvoices}: ${bill.issuesInvoices ? 'sí' : 'no'}\n`;
  if (bill.invoiceNotes) payBody += `- ${L.billInvoiceNotes}: ${bill.invoiceNotes}\n`;
  if (bill.invoiceNotesTags?.length) payBody += `- ${L.billInvoiceNotesTags}: ${bill.invoiceNotesTags.join(', ')}\n`;
  files[`billing/payments_and_billing.${lang}.txt`] = payBody;

  let invoiceBody = h1(L.invoiceReceipts) + `${L.category}: ${L.billing}\n\n`;
  invoiceBody += `- ${L.billIssuesInvoices}: ${bill.issuesInvoices ? 'sí' : 'no'}\n`;
  invoiceBody += `- ${L.billInvoiceNotes}: ${bill.invoiceNotes || ''}\n`;
  // (El bloque de re-intento legacy eliminado: localización ya aplicada arriba.)
  files[`billing/invoice_receipts.${lang}.txt`] = invoiceBody;

  // Support
  // Support con horarios formateados
  let sup = h1(L.contactSupport) + `${L.category}: ${L.support}\n\n`;
  sup += section(L.phone, p.contacts?.phone);
  sup += section(L.whatsapp, p.contacts?.whatsapp);
  sup += section(L.email, p.contacts?.email);
  const scheduleLines: string[] = [];
  if (p.schedules?.checkIn) scheduleLines.push(`${L.scheduleCheckIn}: ${p.schedules.checkIn}`);
  if (p.schedules?.checkOut) scheduleLines.push(`${L.scheduleCheckOut}: ${p.schedules.checkOut}`);
  if (p.schedules?.breakfast) scheduleLines.push(`${L.scheduleBreakfast}: ${p.schedules.breakfast}`);
  if (p.schedules?.quietHours) scheduleLines.push(`${L.scheduleQuietHours}: ${p.schedules.quietHours}`);
  sup += section(L.hours, scheduleLines.join(' | '));
  files[`support/contact_support.${lang}.txt`] = sup;

  // Cancel reservation (estructura nueva)
  let cancelBody = h1(L.cancellationPolicy) + `${L.category}: ${L.cancel_reservation}\n\n`;
  const cancellation = p.policies?.cancellation;
  if (typeof cancellation === 'string') {
    cancelBody += `${cancellation}\n`;
  } else if (cancellation && typeof cancellation === 'object') {
    const flex = cancellation.flexible || '';
    const nonRef = cancellation.nonRefundable || '';
    const channelsArr: string[] = Array.isArray(cancellation.channels) ? cancellation.channels : (
      typeof cancellation.channels === 'string' && cancellation.channels ? [cancellation.channels] : []
    );
    const noShow = cancellation.noShow || '';
    cancelBody += `- ${L.cancelFlexible}: ${flex}\n`;
    cancelBody += `- ${L.cancelNonRefundable}: ${nonRef}\n`;
    cancelBody += `- ${L.cancelChannels}: ${channelsArr.join(', ')}\n`;
    cancelBody += `- ${L.cancelNoShow}: ${noShow}\n`;
  } else {
    // vacío pero con estructura
    cancelBody += `- ${L.cancelFlexible}: \n- ${L.cancelNonRefundable}: \n- ${L.cancelChannels}: \n- ${L.cancelNoShow}: \n`;
  }
  files[`cancel_reservation/cancellation_policy.${lang}.txt`] = cancelBody;

  // Reservation playbooks
  files[`reservation/reservation_flow.${lang}.txt`] = h1(L.reservationFlow) + `${L.category}: ${L.reservation}\n\n`;
  files[`reservation/modify_reservation.${lang}.txt`] = h1(L.modifyReservation) + `${L.category}: ${L.reservation}\n\n`;

  files[`reservation_snapshot/reservation_snapshot.${lang}.txt`] = h1(L.reservationSnapshot) + `${L.category}: ${L.reservation_snapshot}\n\n`;
  files[`reservation_verify/reservation_verify.${lang}.txt`] = h1(L.reservationVerify) + `${L.category}: ${L.reservation_verify}\n\n`;

  return files;
}
