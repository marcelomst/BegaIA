// Path: /root/begasist/types/categoryRegistry.ts

/**
 * Registro de categoría global (category_registry)
 * Define un "contrato" lógico para cada categoría/promptKey del sistema.
 */
export interface CategoryTemplates {
    system?: string;           // Texto de instrucciones del sistema
    prompt?: string;           // Prompt principal base
    userExamples?: string[];   // Ejemplos de entradas de usuario
    meta?: Record<string, any>;// Metadatos adicionales
    [key: string]: any;        // Compatibilidad con claves previas
}

export interface CategoryRegistry {
    /** ID lógico único: "<category>/<promptKey>" */
    categoryId: string;

    /** Nombre legible o etiqueta (ej. "EV Charging") */
    name?: string;

    /** Activada globalmente */
    enabled?: boolean;

    /** Router base (vinculado al grafo) */
    routerCategory?: string;
    routerPromptKey?: string;
    router?: { category?: string; promptKey?: string };

    /** Configuración de retrieval asociada */
    retrieverTopK?: number;
    retrieverFilters?: Record<string, string>;
    retriever?: { topK?: number; filters?: Record<string, any> };

    /** Plantillas estructuradas (compatible con Record<string, any> histórico) */
    templates?: CategoryTemplates;

    /** Política de fallback semántico ("qa", "general", etc.) */
    fallback?: string;

    /** Intents asociados (si se utiliza para clasificación) */
    intents?: string[];

    /** Auditoría / housekeeping */
    createdAt?: string | Date;
    updatedAt?: string | Date;
    /** Quién realizó la última modificación (no incluído en esquema CQL legacy) */
    updatedBy?: string;
    version?: number;
}
