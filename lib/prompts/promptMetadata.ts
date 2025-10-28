// Fuente de verdad del grafo: categorías y subclaves (promptKeys/subtemas)
// Extraído y alineado con lib/agents/graph.ts
export const promptMetadata: Record<string, string[]> = {
    // RAG general
    retrieval_based: [
        "room_info",
        "room_info_img",
        "ambiguity_policy",
        "kb_general",
    ],

    // Flujo de reservas
    reservation: [
        "reservation_flow",
        "modify_reservation",
    ],
    reservation_snapshot: [
        "reservation_snapshot",
    ],
    reservation_verify: [
        "reservation_verify",
    ],

    // Cancelación (alineado a category del grafo y filtro RAG)
    cancel_reservation: [
        "cancel_reservation",  //falta
        "cancellation_policy",
    ],

    // Amenidades/servicios
    amenities: [
        "amenities_list",
        "pool_gym_spa",
        "breakfast_bar",
        "parking",
    ],

    // Facturación
    billing: [
        "payments_and_billing",
        "invoice_receipts",
    ],

    // Soporte general
    support: [
        "contact_support",
    ],

    // Subnodos explícitos de modificación (internos del flujo)
    modify_reservation_field: [
        "ask_field",
    ],
    modify_reservation_value: [
        "ask_value",
    ],
    modify_reservation_confirm: [
        "confirm",
    ],
};

export default promptMetadata;
