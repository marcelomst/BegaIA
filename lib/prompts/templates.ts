// /home/marcelo/begasist/lib/prompts/templates.ts

export type TemplateEntry = { key: string; title: string; body: string };
export type TemplatesByCategory = Record<string, TemplateEntry[]>;

// Categorías por defecto (fallback) cuando promptMetadata está vacío
export const defaultCategories: string[] = [
    'retrieval_based',
    'reservation',
    'amenities',
    'billing',
    'support',
];

// Atajos de plantillas por categoría para “Crear documento simple” en el admin
export const templates: TemplatesByCategory = {
    retrieval_based: [
        {
            key: 'kb_general',
            title: 'Información general del hotel (KB general)',
            body:
                `Titulo: Información general del hotel\n` +
                `Categoria: retrieval_based\n` +
                `Resumen: Breve descripción del hotel, estilo, servicios clave y público objetivo.\n` +
                `Cuerpo:\n` +
                `- Estilo y ambiente:\n` +
                `- Habitaciones (tipos, capacidad):\n` +
                `- Servicios principales (desayuno, wifi, piscina, etc.):\n` +
                `- Ubicación y puntos de interés cercanos:\n` +
                `- Políticas generales (horarios, mascotas, fumadores):\n` +
                `Fuentes:\n` +
                `- URL(s) de referencia:`,
        },
        {
            key: 'room_info',
            title: 'Tipos de habitaciones – resumen',
            body:
                `Titulo: Tipos de habitaciones – resumen\n` +
                `Categoria: retrieval_based\n` +
                `Cuerpo:\n` +
                `- Tipos y capacidades (m² si aplica):\n` +
                `- Configuración de camas por tipo:\n` +
                `- Vistas/balcón si aplica:\n` +
                `- Amenities destacados por tipo:\n` +
                `Notas:\n` +
                `- Accesibilidad si aplica:`,
        },
        {
            key: 'room_info_img',
            title: 'Habitaciones con iconos e imágenes',
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
            key: 'ambiguity_policy',
            title: 'Política de ambigüedad y desambiguación',
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
    ],
    reservation: [
        {
            key: 'reservation_flow',
            title: 'Flujo de reserva – Datos necesarios',
            body:
                `Titulo: Flujo de reserva – Datos necesarios\n` +
                `Categoria: reservation\n` +
                `Cuerpo:\n` +
                `- Datos requeridos: nombre completo, tipo de habitación, check-in, check-out, huéspedes\n` +
                `- Orden sugerido de preguntas:\n` +
                `- Reglas/validaciones (fechas válidas, capacidad por habitación):`,
        },
        {
            key: 'modify_reservation',
            title: 'Modificar reserva – Campo y nuevo valor',
            body:
                `Titulo: Modificar reserva – Campo y nuevo valor\n` +
                `Categoria: reservation\n` +
                `Cuerpo:\n` +
                `- Campos modificables: fechas, nombre, habitación, huéspedes\n` +
                `- Confirmación de cambios y snapshot:`,
        },
    ],
    amenities: [
        {
            key: 'amenities_list',
            title: 'Listado de amenities y horarios',
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
            key: 'pool_gym_spa',
            title: 'Piscina, Gimnasio y Spa – Horarios y reglas',
            body:
                `Titulo: Piscina, Gimnasio y Spa – Horarios y reglas\n` +
                `Categoria: amenities\n` +
                `Cuerpo:\n` +
                `- Piscina: (horario, temporada, toallas)\n` +
                `- Gimnasio: (horario, requisitos)\n` +
                `- Spa: (servicios, reservas, costo)`,
        },
        {
            key: 'breakfast_bar',
            title: 'Desayuno y Bar – Tiempos y opciones',
            body:
                `Titulo: Desayuno y Bar – Tiempos y opciones\n` +
                `Categoria: amenities\n` +
                `Cuerpo:\n` +
                `- Desayuno: (horario, lugar, tipo)\n` +
                `- Bar: (horario, carta, room service)`,
        },
        {
            key: 'parking',
            title: 'Estacionamiento – Cupos y costos',
            body:
                `Titulo: Estacionamiento – Cupos y costos\n` +
                `Categoria: amenities\n` +
                `Cuerpo:\n` +
                `- Disponibilidad/cupos\n` +
                `- Costo y reservas\n` +
                `- Altura máxima/condiciones`,
        },
    ],
    billing: [
        {
            key: 'payments_and_billing',
            title: 'Medios de pago y facturación',
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
            key: 'invoice_receipts',
            title: 'Facturación – Facturas y recibos',
            body:
                `Titulo: Facturación – Facturas y recibos\n` +
                `Categoria: billing\n` +
                `Cuerpo:\n` +
                `- Datos necesarios para factura\n` +
                `- Moneda e impuestos\n` +
                `- Plazos y emisión de comprobantes`,
        },
    ],
    support: [
        {
            key: 'contact_support',
            title: 'Contacto y soporte',
            body:
                `Titulo: Contacto y soporte\n` +
                `Categoria: support\n` +
                `Cuerpo:\n` +
                `- Teléfono recepción:\n` +
                `- Whatsapp/Email:\n` +
                `- Horario de atención:\n` +
                `- Escalamiento (guardia/nocturno):`,
        },
    ],
    cancel_reservation: [
        {
            key: 'cancellation_policy',
            title: 'Política de cancelación',
            body:
                `Titulo: Política de cancelación\n` +
                `Categoria: cancel_reservation\n` +
                `Cuerpo:\n` +
                `- Ventana de cancelación sin cargo\n` +
                `- Penalidades por no show o fuera de término\n` +
                `- Canales de modificación/cancelación`,
        },
    ],
    reservation_snapshot: [
        {
            key: 'reservation_snapshot',
            title: 'Snapshot de reserva – Contenido',
            body:
                `Titulo: Snapshot de reserva – Contenido\n` +
                `Categoria: reservation_snapshot\n` +
                `Cuerpo:\n` +
                `- Campos incluidos: id, fechas, habitación, huéspedes\n` +
                `- Formato y visibilidad`,
        },
    ],
    reservation_verify: [
        {
            key: 'reservation_verify',
            title: 'Verificación de reserva – Reglas',
            body:
                `Titulo: Verificación de reserva – Reglas\n` +
                `Categoria: reservation_verify\n` +
                `Cuerpo:\n` +
                `- Consistencia de fechas y capacidades\n` +
                `- Confirmaciones requeridas`,
        },
    ],
};
