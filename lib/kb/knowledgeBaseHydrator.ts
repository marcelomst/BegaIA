// Path: /root/begasist/lib/kb/knowledgeBaseHydrator.ts

import { hydrateTemplateGlobal } from "./templateHydrator";
import type {
    KnowledgeBaseHydrator,
    HydrationResult,
    ChannelType,
    KnowledgeState,
    TemplateContext,
} from "@/types/kb";

export class DefaultKnowledgeBaseHydrator implements KnowledgeBaseHydrator {
    async getHydratedContent(params: {
        hotelId: string;
        categoryId: string;
        lang: string;
        channel: ChannelType;
        version?: string;
    }): Promise<HydrationResult> {
        const { machineBody, templateContext } =
            await this.loadMachineTemplate(params);

        const knowledge = await this.buildKnowledgeState(params);

        const hydrated = hydrateTemplateGlobal(machineBody, {
            ...(templateContext as TemplateContext),
            knowledge,
        });

        return {
            ...hydrated,
            resolvedValues: {}, // futuro: mapear key → valor usado
            valueSources: {},   // futuro: mapear key → origen del valor
        };
    }

    private async loadMachineTemplate(params: {
        hotelId: string;
        categoryId: string;
        lang: string;
        version?: string;
    }): Promise<{ machineBody: string; templateContext: TemplateContext }> {
        // TODO: Reusar /api/hotel-content/get o lógica equivalente.
        // Debe devolver SIEMPRE el machineBody con tokens (override → registry → seed).
        throw new Error("Not implemented");
    }

    private async buildKnowledgeState(params: {
        hotelId: string;
        lang: string;
        channel: ChannelType;
    }): Promise<KnowledgeState> {
        // TODO: Grafo + PMS + overrides → KnowledgeState.values
        throw new Error("Not implemented");
    }
}
