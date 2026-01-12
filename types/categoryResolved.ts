// Path: /root/begasist/types/categoryResolved.ts
import type { CategoryRegistry } from "@/types/categoryRegistry";
import type { CategoryOverrides } from "@/types/categoryOverrides";

/**
 * Contenido efectivo que el sistema terminó eligiendo
 * (lo que vino de hotel_content + hotel_version_index).
 */
export interface ResolvedContent {
    /** id real en Astra (hotel_content) */
    id?: string;
    hotelId: string;
    category: string;
    promptKey: string;
    lang: string;
    version: string;
    type?: "playbook" | "standard";
    title?: string;
    body?: string;
    /** metadatos crudos por si el caller quiere loggear */
    raw?: Record<string, any>;
}

/**
 * Resultado consolidado de:
 * - category_registry (definición global)
 * - category_overrides (ajuste por hotel)
 * - hotel_content + hotel_version_index (contenido efectivo)
 *
 * La gracia es que el caller ya tenga TODO en un solo objeto.
 */
export interface CategoryResolved {
    /** Siempre presente: clave lógica “categoria/promptKey” */
    categoryId: string;

    /** Hotel para el que se resolvió esto */
    hotelId: string;

    /** Está habilitado globalmente? (registry) */
    enabled: boolean;

    /** Fuente de la definición base (registry) */
    registry?: CategoryRegistry;

    /** Override aplicado (si hubiera) */
    override?: CategoryOverrides;

    /**
     * Routing final que debe usar el grafo / agente.
     * Si había override de router, ya viene aplicado acá.
     */
    router: {
        category: string;
        promptKey: string;
    };

    /**
     * Parámetros finales de retrieval (topK + filters) ya mezclados:
     * 1) registry
     * 2) override
     * el override pisa al registry
     */
    retriever: {
        topK: number;
        filters: Record<string, string>;
    };

    /**
     * Idioma final elegido después de aplicar override y/o defaults.
     */
    lang: string;

    /**
     * Contenido efectivo que debe mostrarse / alimentar al RAG.
     */
    content?: ResolvedContent;

    /**
     * Traza mínima para debuggear por qué se eligió esto.
     */
    debug?: {
        reason?: string;
        sources?: Array<"registry" | "override" | "hotel_content" | "fallback_system">;
    };
}
