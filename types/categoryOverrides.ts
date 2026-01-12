// Path: /root/begasist/types/categoryOverrides.ts

/**
 * Reglas de override por hotel (category_overrides)
 * Permiten personalizar versiones, idioma, router o retriever por hotel/categoría.
 */
export interface CategoryOverrides {
    /** Hotel al que aplica este override */
    hotelId: string;

    /** Clave lógica global de la categoría (p. ej. "amenities/ev_charging") */
    categoryId: string;

    /** Activado/desactivado para el hotel */
    enabled?: boolean;

    /** Preferencias de idioma, versión o ID específico de contenido */
    preferLang?: string;
    preferVersion?: string;
    preferContentId?: string;

    /** Router override: desvío a otra categoría/promptKey */
    routerOverrideCategory?: string;
    routerOverridePromptKey?: string;

    /** Retriever override: topK o filtros distintos */
    retrieverOverrideTopK?: number;
    retrieverOverrideFilters?: Record<string, string>;

    /** Comentarios administrativos o notas */
    notes?: string;

    /** Auditoría / housekeeping */
    createdAt?: string | Date;
    updatedAt?: string | Date;
}
