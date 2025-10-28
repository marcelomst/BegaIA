import { NextResponse } from 'next/server';
import promptMetadata from '@/lib/prompts/promptMetadata';
import { templates } from '@/lib/prompts/templates';

export async function GET() {
    // Fuente de verdad: promptMetadata – sin fallback
    const categories = Object.keys(promptMetadata || {});
    // Filtrar templates sólo a categorías del grafo
    const templatesFiltered = Object.fromEntries(
        Object.entries(templates).filter(([cat]) => categories.includes(cat))
    );
    return NextResponse.json({ categories, promptMetadata, templates: templatesFiltered });
}

