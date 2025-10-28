import * as fs from 'fs';

export type Profile = {
    hotelId: string;
    hotelName: string;
    defaultLanguage?: string;
    timezone?: string;
    location: {
        address: string;
        city: string;
        state?: string;
        postalCode?: string;
        country: string;
        coordinates?: { lat: number; lng: number };
    };
    contacts: { email?: string; phone?: string; whatsapp?: string; website?: string };
    schedules?: { checkIn?: string; checkOut?: string; breakfast?: string; quietHours?: string };
    amenities?: {
        hasParking?: boolean; parkingNotes?: string;
        hasPool?: boolean; poolSchedule?: string;
        hasGym?: boolean; gymSchedule?: string;
        hasSpa?: boolean; spaSchedule?: string;
        other?: string[];
    };
    payments?: { methods?: string[]; notes?: string; requiresCardForBooking?: boolean };
    billing?: { issuesInvoices?: boolean; invoiceNotes?: string };
    policies?: { pets?: string; smoking?: string; cancellation?: string };
    airports?: Array<{ code: string; name: string; distanceKm?: number; driveTime?: string }>;
    transport?: { hasPrivateTransfer?: boolean; transferNotes?: string; taxiNotes?: string; busNotes?: string };
    attractions?: Array<{ name: string; distanceKm?: number; notes?: string }>;
    rooms?: Array<{
        name: string;
        sizeM2?: number;
        capacity?: number;
        beds?: string;
        description?: string;
        highlights?: string[];
        images?: string[];
        icon?: string;
        accessible?: boolean;
    }>;
};

function header(title: string, categoria: string, promptKey: string, resumen: string) {
    return `# ${title}\n\nCategoria: ${categoria}\nPromptKey: ${promptKey}\n\nResumen: ${resumen}\n\nCuerpo:\n`;
}
const bullets = (lines: string[]) => lines.map(l => (l.startsWith('-') ? l : `- ${l}`)).join('\n') + '\n\n';
const fuentes = () => `Fuentes:\n- URL(s) de referencia: http://127.0.0.1:8081/\n`;

export function genAmenitiesList(p: Profile) {
    const other = p.amenities?.other ?? [];
    const notes: string[] = [];
    if (p.amenities?.hasParking) notes.push('Estacionamiento disponible.');
    if (p.amenities?.hasPool) notes.push('Piscina disponible.');
    if (p.amenities?.hasGym) notes.push('Gimnasio disponible.');
    if (p.amenities?.hasSpa) notes.push('Spa disponible.');
    const lines = [
        `Wi‑Fi: gratuito en todo el hotel`,
        `Recepción: 24/7`,
        ...notes,
        ...other
    ];
    return header('Lista de amenities', 'amenities', 'amenities_list', 'Servicios y facilidades del hotel.') + bullets(lines) + fuentes();
}
export function genBreakfast(p: Profile) {
    const sched = p.schedules?.breakfast ?? '07:30–10:30';
    const body = [
        `Horario de desayuno: ${sched}`,
        `Tipo: continental y regional (puede variar por temporada)`,
    ];
    return header('Desayuno y bar', 'amenities', 'breakfast_bar', 'Horarios e información del desayuno y bar.') + bullets(body) + fuentes();
}
export function genParking(p: Profile) {
    const has = p.amenities?.hasParking;
    const notes = p.amenities?.parkingNotes || (has ? 'Cocheras sujetas a disponibilidad.' : 'No contamos con estacionamiento propio.');
    const body = [
        has ? 'Disponible en el establecimiento.' : 'Alternativas cercanas (de pago).',
        notes,
    ];
    return header('Estacionamiento', 'amenities', 'parking', 'Opciones y condiciones de estacionamiento.') + bullets(body) + fuentes();
}
export function genPoolGymSpa(p: Profile) {
    const body: string[] = [];
    if (p.amenities?.hasPool) body.push(`Piscina: horario ${p.amenities.poolSchedule ?? '09:00–21:00'}`);
    if (p.amenities?.hasGym) body.push(`Gimnasio: horario ${p.amenities.gymSchedule ?? '07:00–22:00'}`);
    if (p.amenities?.hasSpa) body.push(`Spa: horario ${p.amenities.spaSchedule ?? 'con reserva'}`);
    if (body.length === 0) body.push('No contamos con piscina, gimnasio ni spa.');
    return header('Piscina, gimnasio y spa', 'amenities', 'pool_gym_spa', 'Instalaciones de bienestar y sus horarios.') + bullets(body) + fuentes();
}
export function genArrivalsTransport(p: Profile) {
    const airports = p.airports ?? [];
    const lines: string[] = [];
    if (airports.length) {
        lines.push('Aeropuertos cercanos:');
        for (const a of airports) {
            lines.push(`  - ${a.name} (${a.code})${a.distanceKm ? `: ~${a.distanceKm} km` : ''}${a.driveTime ? ` (${a.driveTime})` : ''}.`);
        }
    }
    if (p.transport?.hasPrivateTransfer || p.transport?.transferNotes) lines.push(`Traslados / Transfer privado: ${p.transport.transferNotes ?? 'consultá tarifas y disponibilidad por WhatsApp.'}`);
    if (p.transport?.taxiNotes) lines.push(`Taxi / Remis: ${p.transport.taxiNotes}`);
    if (p.transport?.busNotes) lines.push(`Bus / Ómnibus: ${p.transport.busNotes}`);
    lines.push('Contacto del hotel para coordinar llegada:');
    if (p.contacts.whatsapp) lines.push(`  - WhatsApp: ${p.contacts.whatsapp}`);
    if (p.contacts.email) lines.push(`  - Email: ${p.contacts.email}`);
    return header('Cómo llegar y transportes', 'amenities', 'arrivals_transport', 'Aeropuertos cercanos, traslados y opciones para llegar al hotel.') + bullets(lines) + fuentes();
}
export function genPayments(p: Profile) {
    const methods = p.payments?.methods?.length ? p.payments.methods.join(', ') : 'Efectivo y tarjetas (puede variar)';
    const lines = [
        `Métodos aceptados: ${methods}.`,
        p.payments?.notes ? `Notas: ${p.payments.notes}` : undefined,
        p.payments?.requiresCardForBooking ? 'Se solicita tarjeta para garantizar algunas reservas.' : undefined,
    ].filter(Boolean) as string[];
    return header('Medios de pago y facturación', 'billing', 'payments_and_billing', 'Formas de pago aceptadas y consideraciones.') + bullets(lines) + fuentes();
}
export function genInvoice(p: Profile) {
    const lines = [
        p.billing?.issuesInvoices ? 'Emitimos factura fiscal a solicitud.' : 'No emitimos factura fiscal.',
        p.billing?.invoiceNotes ? `Notas: ${p.billing.invoiceNotes}` : undefined,
    ].filter(Boolean) as string[];
    return header('Facturas y recibos', 'billing', 'invoice_receipts', 'Emisión de facturas y comprobantes.') + bullets(lines) + fuentes();
}
export function genSupport(p: Profile) {
    const lines: string[] = [
        'Recepción: 24/7; teléfono interno desde habitación.'
    ];
    if (p.contacts.email) lines.push(`Email: ${p.contacts.email}`);
    if (p.contacts.whatsapp) lines.push(`WhatsApp: ${p.contacts.whatsapp}`);
    if (p.contacts.phone) lines.push(`Teléfono: ${p.contacts.phone}`);
    return header('Soporte y contacto', 'support', 'contact_support', 'Canales de soporte para huéspedes y consultas generales.') + bullets(lines) + fuentes();
}
export function genKbGeneral(p: Profile) {
    const lines: string[] = [
        `Nombre del hotel: ${p.hotelName}`,
        `Dirección: ${p.location.address}, ${p.location.city}, ${p.location.country}`,
    ];
    if (p.schedules?.checkIn) lines.push(`Check-in: ${p.schedules.checkIn}`);
    if (p.schedules?.checkOut) lines.push(`Check-out: ${p.schedules.checkOut}`);
    if (p.policies?.pets) lines.push(`Política de mascotas: ${p.policies.pets}`);
    if (p.policies?.smoking) lines.push(`Política de humo/tabaco: ${p.policies.smoking}`);
    return header('Información general del hotel', 'retrieval_based', 'kb_general', 'Datos básicos del hotel y políticas esenciales.') + bullets(lines) + fuentes();
}

export function genCancellationPolicy(p: Profile) {
    const policy = p.policies?.cancellation || 'La política de cancelación será informada durante el proceso de reserva.';
    const lines = [policy];
    return header('Política de cancelación', 'cancellation', 'cancellation_policy', 'Reglas y plazos de cancelación de reservas.') + bullets(lines) + fuentes();
}
export function genRoomInfo(p: Profile) {
    const lines: string[] = [];
    if (p.rooms && p.rooms.length) {
        for (const r of p.rooms) {
            const size = r.sizeM2 ? ` (~${r.sizeM2} m²)` : '';
            const cap = r.capacity ? ` · cap. ${r.capacity}` : '';
            const beds = r.beds ? `\n   Camas: ${r.beds}` : '';
            const desc = r.description ? `\n   ${r.description}` : '';
            const hi = r.highlights?.length ? `\n   Highlights: ${r.highlights.join('; ')}` : '';
            lines.push(`Tipo: ${r.name}${size}${cap}${beds}${desc}${hi}`);
        }
    } else {
        lines.push('Tipos y capacidades próximamente.');
    }
    return header('Tipos de habitaciones – resumen', 'retrieval_based', 'room_info', 'Resumen de tipos de habitaciones, capacidades y highlights.') + bullets(lines) + fuentes();
}
export function genRoomInfoImg(p: Profile) {
    const lines: string[] = [];
    if (p.rooms && p.rooms.length) {
        for (const r of p.rooms) {
            const icon = r.icon ? `\nIcono: ${r.icon}` : '';
            const hi = r.highlights?.length ? `\nHighlights: ${r.highlights.join(' | ')}` : '';
            const imgs = r.images?.length ? `\nImages: ${JSON.stringify(r.images)}` : '';
            lines.push(`Tipo: ${r.name}${icon}${hi}${imgs}`);
        }
    } else {
        lines.push('Tipos con imágenes próximamente.');
    }
    return header('Habitaciones con iconos e imágenes', 'retrieval_based', 'room_info_img', 'Tipos de habitaciones con iconos y links de imágenes para la UI.') + bullets(lines) + fuentes();
}

export function generateKbFilesFromProfile(p: Profile): Record<string, string> {
    const files: Record<string, string> = {};
    const today = new Date().toISOString().slice(0, 10);
    files['amenities/amenities_list.es.txt'] = genAmenitiesList(p);
    files['amenities/breakfast_bar.es.txt'] = genBreakfast(p);
    files['amenities/parking.es.txt'] = genParking(p);
    files['amenities/pool_gym_spa.es.txt'] = genPoolGymSpa(p);
    files['amenities/arrivals_transport.es.txt'] = genArrivalsTransport(p);
    files['billing/payments_and_billing.es.txt'] = genPayments(p);
    files['billing/invoice_receipts.es.txt'] = genInvoice(p);
    files['support/contact_support.es.txt'] = genSupport(p);
    files['policies/cancellation_policy.es.txt'] = genCancellationPolicy(p);
    files[`informacion-general-del-hotel-kb-general_${today}.txt-v1.txt`] = genKbGeneral(p);
    files['room_info.es.txt'] = genRoomInfo(p);
    files['room_info_img.es.txt'] = genRoomInfoImg(p);
    return files;
}

export async function writeKbFilesToDisk(baseDir: string, files: Record<string, string>) {
    for (const [rel, content] of Object.entries(files)) {
        const full = `${baseDir}/${rel}`;
        await fs.promises.mkdir(full.substring(0, full.lastIndexOf('/')), { recursive: true });
        await fs.promises.writeFile(full, content, 'utf8');
    }
}
