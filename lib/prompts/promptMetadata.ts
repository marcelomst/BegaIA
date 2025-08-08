// Path: /root/begasist/lib/prompts/promptMetadata.ts

/**
 * Define qué promptKeys son válidas para cada categoría.
 * Esto evita que el clasificador invente claves y permite escalar de forma controlada.
 */
export const promptMetadata: Record<string, string[]> = {
  retrieval_based: ["room_info"],
  reservation: [],
  cancel_reservation: [],     // 👈🏼 Agregado aquí
  amenities: [],
  billing: [],
  support: [],
};
