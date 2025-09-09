// Path: /root/begasist/lib/prompts/index.ts
export const promptMetadata: Record<string, string[]> = {
  // ➜ Cubre preguntas de info “estática/curada”:
  //    - horarios (check-in / check-out)
  //    - políticas (cancelación, mascotas, fumar, etc.)
  //    - tipos de habitación (descripción, equipamiento)
  //    - reglas de la casa
  retrieval_based: ["room_info"],

  // Flujo de reserva (slot-filling y/o MCP)
  reservation: [],

  // Cancelación explícita (si existe el nodo; si no, que derive a reservation/cancellation flow)
  cancel_reservation: [],

  // Servicios/amenities (si después tenés prompts propios, los agregás)
  amenities: [],

  billing: [],
  support: [],
};
  // Podés agregar más categorías y prompts según lo que necesites manejar