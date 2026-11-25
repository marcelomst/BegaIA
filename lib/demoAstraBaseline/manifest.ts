// Path: /lib/demoAstraBaseline/manifest.ts

import crypto from "node:crypto";

export const DEMO_ASTRA_BASELINE_VERSION = "demo-astra-baseline-v1";
export const DEMO_ASTRA_HOTEL_ID = "hotel999";
export const DEMO_ASTRA_APPLY_CONFIRMATION = "APPLY-DEMO-ASTRA-BASELINE-V1";

export const KNOWN_DEVELOPER_KEYSPACES = [
  "hotel_data",
  "development",
  "developer",
] as const;

export type BaselineObjectKind = "collection" | "table";
export type BaselineObjectState = "seeded" | "empty";
export type BaselineCreationPolicy = "create-if-missing" | "preprovisioned";

export type BaselineObjectContract = Readonly<{
  kind: BaselineObjectKind;
  name: string;
  state: BaselineObjectState;
  creation: BaselineCreationPolicy;
  dependsOn?: readonly string[];
  schemaRef: string;
  purpose: string;
}>;

export const DEMO_ASTRA_OBJECTS: readonly BaselineObjectContract[] = [
  {
    kind: "collection",
    name: "baseline_control",
    state: "seeded",
    creation: "create-if-missing",
    schemaRef: "lib/demoAstraBaseline/manifest.ts#BaselineControlDocument",
    purpose: "Identidad, versión y hashes del baseline aplicado.",
  },
  {
    kind: "collection",
    name: "hotel_config",
    state: "seeded",
    creation: "create-if-missing",
    dependsOn: ["baseline_control"],
    schemaRef: "types/channel.ts#HotelConfig",
    purpose: "Configuración sintética de hotel999 con canal Web únicamente.",
  },
  {
    kind: "collection",
    name: "category_registry",
    state: "seeded",
    creation: "create-if-missing",
    dependsOn: ["hotel_config"],
    schemaRef: "types/categoryRegistry.ts#CategoryRegistry",
    purpose: "Registro canónico versionado de categorías y plantillas.",
  },
  {
    kind: "collection",
    name: "system_playbook",
    state: "seeded",
    creation: "create-if-missing",
    dependsOn: ["baseline_control"],
    schemaRef: "lib/astra/systemPlaybook.ts#SystemPlaybookDoc",
    purpose: "Playbooks sintéticos sin generación de embeddings.",
  },
  {
    kind: "collection",
    name: "hotel_content",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["hotel_config", "category_registry"],
    schemaRef: "types/hotelContent.ts#HotelContent",
    purpose: "Contenido hidratado opcional; comienza vacío.",
  },
  {
    kind: "collection",
    name: "hotel_version_index",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["hotel_content"],
    schemaRef: "types/hotelContent.ts#HotelVersionIndex",
    purpose: "Índice de versiones de contenido; comienza vacío.",
  },
  {
    kind: "collection",
    name: "hotel_text_collection",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["hotel_config"],
    schemaRef: "lib/astra/hotelTextCollection.ts#saveOriginalTextChunksToAstra",
    purpose: "Fuentes textuales de KB; la ingestión externa queda diferida.",
  },
  {
    kind: "collection",
    name: "hotel999_collection",
    state: "empty",
    creation: "preprovisioned",
    dependsOn: ["hotel_config"],
    schemaRef: "lib/retrieval/index.ts#getCollectionName",
    purpose: "Colección vectorial por hotel; opciones físicas no se inventan.",
  },
  {
    kind: "collection",
    name: "guests",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["hotel_config"],
    schemaRef: "types/channel.ts#Guest",
    purpose: "Perfiles operacionales; sin huéspedes al inicializar.",
  },
  {
    kind: "collection",
    name: "conversations",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["guests"],
    schemaRef: "types/channel.ts#Conversation",
    purpose: "Conversaciones operacionales; comienza vacía.",
  },
  {
    kind: "collection",
    name: "messages",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["conversations"],
    schemaRef: "lib/db/messages.ts#MessageDoc",
    purpose: "Mensajes operacionales; comienza vacía.",
  },
  {
    kind: "collection",
    name: "conv_state",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["conversations"],
    schemaRef: "lib/db/convState.ts#ConversationFlowState",
    purpose: "Estado conversacional derivado; comienza vacío.",
  },
  {
    kind: "collection",
    name: "poi",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["hotel_config"],
    schemaRef: "types/poi.ts#POIRecord",
    purpose: "POI opcionales; no se copian datos de Developer.",
  },
  {
    kind: "table",
    name: "guest_aliases",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["guests"],
    schemaRef: "lib/db/guestAliases.ts#GUEST_ALIASES_TABLE",
    purpose: "Lookup hotelId + alias; comienza vacío.",
  },
  {
    kind: "table",
    name: "guest_aliases_by_guest",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["guest_aliases"],
    schemaRef: "docs/architecture/guest_identity_model.md#guest_aliases_by_guest",
    purpose: "Proyección inversa reparable; comienza vacía.",
  },
  {
    kind: "table",
    name: "demo_cm_reservations",
    state: "empty",
    creation: "create-if-missing",
    dependsOn: ["hotel_config"],
    schemaRef: "lib/db/demoChannelManagerReservations.ts#DEMO_CHANNEL_MANAGER_RESERVATIONS_SCHEMA",
    purpose: "Persistencia del provider sintético astra-demo; sin reservas iniciales.",
  },
] as const;

export const DEMO_ASTRA_SOURCE_CONTRACT = [
  {
    id: "category_registry",
    path: "seeds/category_registry.json",
    sha256: "b3e4875be9eaec7b5d9e78eb82e7c79009f7845a5b6b665a18161b361d25baef",
    usage: "apply",
  },
  {
    id: "system_playbook",
    path: "seeds/system_playbook.seed.jsonl",
    sha256: "986561d0803ab7ac73b3f57d19cf213f77749210875f7047bc299b49c70d0f6d",
    usage: "apply_without_embeddings",
  },
  {
    id: "hotel999_kb",
    path: "kb/hotel999",
    sha256: "876712eb54e1de3ff75e8f930625691cda747423bdcbbeb847ce2a2fd5cf3199",
    usage: "reference_only_external_ingestion_deferred",
  },
] as const;

export const SYNTHETIC_HOTEL_CONFIG = {
  _id: "demo-baseline:hotel999:config:v1",
  hotelId: DEMO_ASTRA_HOTEL_ID,
  hotelName: "Hotel Horizonte Demo",
  country: "UY",
  city: "Ciudad Demo",
  address: "Avenida Ficticia 1000",
  postalCode: "00000",
  defaultLanguage: "es",
  timezone: "America/Montevideo",
  channelConfigs: {
    web: {
      enabled: true,
      mode: "automatic",
    },
  },
  users: [],
  retrievalSettings: {
    useAstra: true,
  },
  assistantBranding: {
    displayName: "Bega Demo",
    roleLabel: "Asistente virtual",
    acknowledgementLabel: "Un gusto",
    avatarVariant: "female",
  },
  contacts: {
    website: "https://hotel-horizonte-demo.invalid",
  },
  schedules: {
    checkIn: "15:00",
    checkOut: "11:00",
    breakfast: "07:30-10:30",
    quietHours: "23:00-07:00",
  },
  amenities: {
    tags: ["Wi-Fi", "Desayuno", "Piscina", "Gimnasio"],
    schedules: {
      pool: "09:00-20:00",
      gym: "07:00-22:00",
    },
    notes: "Servicios ficticios sujetos a disponibilidad de la demostración.",
  },
  payments: {
    methods: ["Tarjeta", "Efectivo"],
    currencies: ["USD", "UYU"],
    requiresCardForBooking: false,
  },
  billing: {
    issuesInvoices: false,
    invoiceNotes: "La demostración no emite comprobantes reales.",
  },
  policies: {
    pets: "Consultar condiciones en recepción.",
    smoking: "No se permite fumar en las habitaciones.",
    cancellation: {
      flexible: "Cancelación sin cargo hasta 48 horas antes.",
      nonRefundable: "Las tarifas no reembolsables no admiten devolución.",
      channels: ["web"],
      noShow: "Se aplica una noche de penalidad.",
    },
  },
  rooms: [
    {
      name: "single",
      capacity: 1,
      beds: "1 cama individual",
      description: "Habitación individual ficticia para demostración.",
      highlights: ["Wi-Fi", "Aire acondicionado"],
      images: ["/hotel999/rooms/single/single.jpg"],
    },
    {
      name: "double",
      capacity: 2,
      beds: "1 cama doble",
      description: "Habitación doble ficticia para demostración.",
      highlights: ["Wi-Fi", "Aire acondicionado"],
      images: ["/hotel999/rooms/double/double.jpg"],
    },
    {
      name: "triple",
      capacity: 3,
      beds: "1 cama doble y 1 individual",
      description: "Habitación triple ficticia para demostración.",
      highlights: ["Wi-Fi", "Aire acondicionado"],
      images: ["/hotel999/rooms/triple/hab-triple-1.jpg"],
    },
  ],
  lastUpdated: "2026-11-25T00:00:00.000Z",
} as const;

export type BaselineControlDocument = Readonly<{
  _id: string;
  baselineVersion: string;
  hotelId: string;
  targetFingerprint: string;
  sourceHashes: Readonly<Record<string, string>>;
}>;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Text(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export const SYNTHETIC_HOTEL_CONFIG_SHA256 = "e0662a80f8d6fda755a968427107fb1e57eb59b72a2d5f6579900e4ca95d5741";

export function buildBaselineControlDocument(targetFingerprint: string): BaselineControlDocument {
  return {
    _id: `baseline:${DEMO_ASTRA_BASELINE_VERSION}`,
    baselineVersion: DEMO_ASTRA_BASELINE_VERSION,
    hotelId: DEMO_ASTRA_HOTEL_ID,
    targetFingerprint,
    sourceHashes: {
      ...Object.fromEntries(DEMO_ASTRA_SOURCE_CONTRACT.map((source) => [source.id, source.sha256])),
      hotel_config: SYNTHETIC_HOTEL_CONFIG_SHA256,
    },
  };
}
