// Path: /root/begasist/lib/kb/templateCompiler.ts

import type {
    TemplateContext,
    CompiledTemplate,
    HydratedTemplate,
    CompileOptions,
} from "@/types/kb";

/**
 * Placeholder: la hidratación real ya la hace el backend en /api/hotel-content/get.
 * Aquí simplemente devolvemos el texto tal cual, para futuros usos client-side si hace falta.
 */
export function hydrateTemplate(
    machineTemplate: string,
    _ctx: TemplateContext
): HydratedTemplate {
    return {
        text: machineTemplate,
        missingKeys: [],
    };
}

/**
 * Definición de mapeos label → key usando patrones flexibles.
 */
interface LabelKeyEntry {
    key: string;
    patterns: RegExp[];
}

/**
 * Normaliza un label para comparaciones básicas:
 * - lower-case
 * - colapsa espacios
 */
function normalizeLabel(label: string): string {
    return label
        .toLowerCase()
        .normalize("NFC")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * Tabla de mapeos base label → key.
 *
 * Convención de keys (sugerida para el grafo global):
 * - contacts.*         : datos de contacto
 * - location.*         : dirección, ciudad, etc.
 * - policies.*         : políticas de checkin/out, cancelación, fumar, etc.
 * - meals.*            : desayuno, restaurante, bar
 * - parking.*          : parking
 * - wifi.*             : wifi
 * - children.*         : políticas de niños
 * - pets.*             : políticas de mascotas
 * - transport.*        : transfer, transporte público
 * - payments.*         : métodos de pago
 */
const LABEL_KEY_MAP: LabelKeyEntry[] = [
    // --- CONTACTO ---
    {
        key: "contacts.phone",
        patterns: [
            /^teléfono$/,
            /^telefono$/,
            /^tel$/,
            /^tel\.$/,
            /^móvil$/,
            /^movil$/,
            /^celular$/,
            /^teléfono recepción$/,
            /^telefono recepcion$/,
        ],
    },
    {
        key: "contacts.landline",
        patterns: [/^teléfono fijo$/, /^telefono fijo$/, /^línea fija$/, /^linea fija$/],
    },
    {
        key: "contacts.whatsapp",
        patterns: [/^whatsapp$/, /^whats app$/, /^whatsapp recepción$/, /^whatsapp recepcion$/],
    },
    {
        key: "contacts.email",
        patterns: [
            /^email$/,
            /^mail$/,
            /^correo electrónico$/,
            /^correo electronico$/,
            /^correo$/,
        ],
    },
    {
        key: "contacts.website",
        patterns: [/^sitio web$/, /^web$/, /^página web$/, /^pagina web$/, /^website$/],
    },
    {
        key: "contacts.hours",
        patterns: [
            /^horario$/,
            /^horario de atención$/,
            /^horario de atencion$/,
            /^horario recepción$/,
            /^horario recepcion$/,
            /^horarios$/,
        ],
    },

    // --- UBICACIÓN ---
    {
        key: "location.address",
        patterns: [/^dirección$/, /^direccion$/, /^address$/],
    },
    {
        key: "location.neighborhood",
        patterns: [/^barrio$/, /^zona$/, /^vecindario$/],
    },
    {
        key: "location.city",
        patterns: [/^ciudad$/, /^localidad$/],
    },
    {
        key: "location.country",
        patterns: [/^país$/, /^pais$/],
    },
    {
        key: "location.how_to_arrive",
        patterns: [
            /^cómo llegar$/,
            /^como llegar$/,
            /^indicaciones$/,
            /^cómo llegar al hotel$/,
            /^como llegar al hotel$/,
        ],
    },

    // --- POLÍTICAS: CHECKIN / CHECKOUT ---
    {
        key: "policies.checkin.from",
        patterns: [
            /^check[- ]?in desde$/,
            /^check in desde$/,
            /^hora de check[- ]?in desde$/,
        ],
    },
    {
        key: "policies.checkin.until",
        patterns: [
            /^check[- ]?in hasta$/,
            /^check in hasta$/,
            /^hora de check[- ]?in hasta$/,
        ],
    },
    {
        key: "policies.checkout.until",
        patterns: [
            /^check[- ]?out hasta$/,
            /^check out hasta$/,
            /^hora de check[- ]?out$/,
            /^hora de check[- ]?out hasta$/,
        ],
    },
    {
        key: "policies.checkout.from",
        patterns: [/^check[- ]?out desde$/, /^check out desde$/],
    },

    // --- POLÍTICAS: CANCELACIÓN / NO SHOW / FUMAR ---
    {
        key: "policies.cancellation",
        patterns: [
            /^política de cancelación$/,
            /^politica de cancelacion$/,
            /^cancelación$/,
            /^cancelacion$/,
        ],
    },
    {
        key: "policies.no_show",
        patterns: [/^política no show$/, /^politica no show$/, /^no show$/],
    },
    {
        key: "policies.smoking",
        patterns: [
            /^política de fumar$/,
            /^politica de fumar$/,
            /^fumar$/,
            /^política de no fumar$/,
            /^politica de no fumar$/,
        ],
    },

    // --- COMIDAS / DESAYUNO / RESTAURANTE ---
    {
        key: "meals.breakfast.included",
        patterns: [/^desayuno incluido$/, /^desayuno$/],
    },
    {
        key: "meals.breakfast.hours",
        patterns: [/^horario de desayuno$/, /^desayuno horario$/],
    },
    {
        key: "meals.breakfast.location",
        patterns: [
            /^lugar de desayuno$/,
            /^desayuno lugar$/,
            /^dónde se sirve el desayuno$/,
            /^donde se sirve el desayuno$/,
        ],
    },
    {
        key: "meals.restaurant.hours",
        patterns: [/^horario del restaurante$/, /^horario restaurante$/],
    },

    // --- PARKING ---
    {
        key: "parking.available",
        patterns: [/^parking$/, /^estacionamiento$/, /^aparcamiento$/],
    },
    {
        key: "parking.type",
        patterns: [/^tipo de parking$/, /^tipo de estacionamiento$/],
    },
    {
        key: "parking.price",
        patterns: [
            /^precio del parking$/,
            /^precio estacionamiento$/,
            /^costo del parking$/,
        ],
    },
    {
        key: "parking.reservation_required",
        patterns: [
            /^parking con reserva$/,
            /^estacionamiento con reserva$/,
            /^se requiere reserva para el parking$/,
        ],
    },

    // --- WIFI ---
    {
        key: "wifi.available",
        patterns: [/^wifi$/, /^wi[- ]?fi$/],
    },
    {
        key: "wifi.areas",
        patterns: [/^zonas con wifi$/, /^dónde hay wifi$/, /^donde hay wifi$/],
    },
    {
        key: "wifi.speed",
        patterns: [/^velocidad del wifi$/, /^velocidad wifi$/],
    },

    // --- NIÑOS ---
    {
        key: "children.policy",
        patterns: [
            /^política de niños$/,
            /^politica de niños$/,
            /^política de menores$/,
            /^politica de menores$/,
        ],
    },
    {
        key: "children.free_until_age",
        patterns: [/^niños gratis hasta$/, /^ninos gratis hasta$/],
    },

    // --- MASCOTAS ---
    {
        key: "pets.policy",
        patterns: [
            /^política de mascotas$/,
            /^politica de mascotas$/,
            /^mascotas$/,
            /^pet friendly$/,
        ],
    },

    // --- TRANSPORTE ---
    {
        key: "transport.airport_shuttle",
        patterns: [
            /^transfer aeropuerto$/,
            /^traslado aeropuerto$/,
            /^shuttle aeropuerto$/,
        ],
    },
    {
        key: "transport.public_transport",
        patterns: [
            /^transporte público cercano$/,
            /^transporte publico cercano$/,
            /^transporte público$/,
            /^transporte publico$/,
        ],
    },

    // --- PAGOS ---
    {
        key: "payments.methods",
        patterns: [
            /^métodos de pago$/,
            /^metodos de pago$/,
            /^formas de pago$/,
        ],
    },
    {
        key: "payments.cards",
        patterns: [
            /^tarjetas aceptadas$/,
            /^tarjetas de crédito$/,
            /^tarjetas de credito$/,
        ],
    },
];

/**
 * Busca la key correspondiente a un label textual.
 */
function findKeyForLabel(rawLabel: string): string | null {
    const normalized = normalizeLabel(rawLabel);

    for (const entry of LABEL_KEY_MAP) {
        if (entry.patterns.some((re) => re.test(normalized))) {
            return entry.key;
        }
    }

    return null;
}

/**
 * Escapa valores por defecto que podrían romper el token (por ejemplo "]]").
 */
function escapeDefaultValue(value: string): string {
    return value.replaceAll("]]", "\\]\\]");
}

/**
 * Compila texto humano → plantilla con tokens.
 *
 * Reglas:
 * - Líneas tipo "Teléfono: 123" o "- Teléfono: 123" se intentan mapear a keys conocidas.
 * - Soporta bullets simples: "- ", "* ", "• ".
 * - Si la línea ya contiene [[key: ...]] en cualquier parte, se deja tal cual (no doble-envuelve).
 * - Si la etiqueta no se reconoce, se deja la línea y se emite warning.
 */
export function compileTemplate(
    humanText: string,
    ctx: TemplateContext,
    options: CompileOptions = {}
): CompiledTemplate {
    const warnings: string[] = [];
    const lines = humanText.split(/\r?\n/);

    const fallbackKnownKeys = LABEL_KEY_MAP.map((e) => e.key);
    const knownKeys = new Set(options.knownKeys ?? fallbackKnownKeys);

    const compiledLines = lines.map((rawLine) => {
        // Línea vacía → tal cual.
        if (!rawLine.trim()) return rawLine;

        // Si ya hay algún token en la línea, no tocamos nada.
        if (rawLine.includes("[[key:")) {
            return rawLine;
        }

        const match = rawLine.match(/^(\s*(?:[-*•]\s*)?)(.+?):\s*(.+)$/u);
        if (!match) {
            return rawLine;
        }

        const [, prefix, rawLabel, rawValue] = match;
        const value = rawValue.trim();

        const key = findKeyForLabel(rawLabel);

        if (!key) {
            warnings.push(
                `No se reconoce la etiqueta "${rawLabel}" como una key conocida en ${ctx.categoryId}`
            );
            return rawLine;
        }

        if (!knownKeys.has(key)) {
            warnings.push(
                `La key "${key}" derivada de la etiqueta "${rawLabel}" no figura en knownKeys`
            );
        }

        const safeDefault = escapeDefaultValue(value);

        const compiledLine =
            `${prefix}${rawLabel.trim()}: ` +
            `[[key: ${key} | default: ${safeDefault}]]`;

        return compiledLine;
    });

    return {
        text: compiledLines.join("\n"),
        warnings,
    };
}
