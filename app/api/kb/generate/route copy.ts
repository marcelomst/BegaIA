// Path: /root/begasist/app/api/kb/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import * as fs from 'fs';
import * as path from 'path';
import { getHotelConfig } from '@/lib/config/hotelConfig.server';
import { loadDocumentFileForHotel } from '@/lib/retrieval';
import { ChatOpenAI } from '@langchain/openai';
import { generateKbFilesFromProfile, type Profile } from '@/lib/kb/generator';
import { upsertHotelContent, versionTagToNumber } from '@/lib/astra/hotelContent';
import { setCurrentVersionInIndex } from '@/lib/astra/hotelVersionIndex';

/** Mapeo mínimo para decidir el type (playbook vs standard) */
function inferType(category: string, promptKey: string): "playbook" | "standard" {
    // Si mañana agregamos reservation_flow / modify_reservation_* / verify / snapshot etc. → playbook
    const PLAYBOOK_KEYS = new Set([
        "reservation_flow",
        "modify_reservation",
        "reservation_snapshot",
        "reservation_verify",
        "ambiguity_policy"
    ]);
    if (PLAYBOOK_KEYS.has(promptKey)) return "playbook";
    // Por categorías también se puede decidir:
    // if (category === "reservation" && promptKey.endsWith("_flow")) return "playbook";
    return "standard";
}

/** Inferencia de metadatos a partir del filename */
function inferMetaFromFilename(rel: string): { category?: string; promptKey?: string; lang?: 'es' | 'en' | 'pt' } {
    // Esperado: category/promptKey.lang.txt  (ej: amenities/amenities_list.es.txt)
    const base = path.basename(rel);
    const dir = path.dirname(rel).replace(/^\.\/+/, '');
    const m = base.match(/^([a-z0-9_]+)\.([a-z]{2})\.txt$/i);
    if (!dir || !m) return {};
    const promptKey = m[1];
    const lang = (m[2] as any) as 'es' | 'en' | 'pt';
    const category = dir.split(path.sep).pop();
    return { category, promptKey, lang };
}

/** Extraer title del body (# Título ...) */
function extractTitle(body: string): string | undefined {
    const m = body.match(/^\s*#\s+(.+)\s*$/m);
    return m ? m[1].trim() : undefined;
}

export async function POST(req: NextRequest) {
    try {
        let parsed: any = null;
        try {
            parsed = await req.json();
        } catch {
            return NextResponse.json({ error: 'Body debe ser JSON' }, { status: 400 });
        }
        const { hotelId, autoEnrich = false, upload = true, overrides } = parsed || {};
        if (!hotelId) return NextResponse.json({ error: 'hotelId requerido' }, { status: 400 });
        const cfg = await getHotelConfig(hotelId);
        if (!cfg) return NextResponse.json({ error: 'Hotel no encontrado' }, { status: 404 });

        // Mapear HotelConfig -> Profile
        const profile: Profile = {
            hotelId,
            hotelName: cfg.hotelName,
            defaultLanguage: cfg.defaultLanguage,
            timezone: cfg.timezone,
            location: {
                address: cfg.address || '',
                city: cfg.city || '',
                country: cfg.country || '',
            },
            contacts: {
                email: cfg.contacts?.email || cfg.users?.[0]?.email,
                phone: cfg.phone,
                whatsapp: cfg.channelConfigs?.whatsapp && (cfg.channelConfigs as any).whatsapp.celNumber,
                website: cfg.contacts?.website,
            },
            schedules: cfg.schedules,
            amenities: cfg.amenities,
            payments: cfg.payments,
            billing: cfg.billing,
            policies: cfg.policies,
            airports: cfg as any as Profile['airports'],
            transport: cfg as any as Profile['transport'],
            attractions: cfg as any as Profile['attractions'],
            rooms: cfg.rooms as any,
        };

        // Merge overrides
        function merge<T>(base: T, extra: Partial<T> | undefined): T {
            if (!extra) return base;
            return { ...(base as any), ...(extra as any) } as T;
        }
        const merged: Profile = {
            ...profile,
            hotelName: overrides?.hotelName ?? profile.hotelName,
            defaultLanguage: overrides?.defaultLanguage ?? profile.defaultLanguage,
            timezone: overrides?.timezone ?? profile.timezone,
            location: merge(profile.location, overrides?.location || {
                address: overrides?.address,
                city: overrides?.city,
                country: overrides?.country,
            } as any),
            contacts: merge(profile.contacts || {}, overrides?.contacts),
            schedules: merge(profile.schedules || {}, overrides?.schedules),
            amenities: merge(profile.amenities || {}, overrides?.amenities),
            payments: merge(profile.payments || {}, overrides?.payments),
            billing: merge(profile.billing || {}, overrides?.billing),
            policies: merge(profile.policies || {}, overrides?.policies),
            rooms: (overrides?.rooms as any) ?? profile.rooms,
        };

        let enriched = merged;
        if (autoEnrich) {
            try {
                const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
                const city = profile.location?.city || '';
                const country = profile.location?.country || '';
                const coords = profile.location?.coordinates ? `${profile.location.coordinates.lat},${profile.location.coordinates.lng}` : '';
                const prompt = `Eres un asistente experto en turismo y hotelería. Devuelve SOLO JSON válido (sin explicaciones, sin formato Markdown, sin comentarios) con forma {"airports":[{"code":"","name":"","distanceKm":n,"driveTime":""}],"transport":{"hasPrivateTransfer":true,"transferNotes":"","taxiNotes":"","busNotes":""},"attractions":[{"name":"","distanceKm":n,"notes":""}]}. Incluye datos reales y actuales de aeropuertos cercanos, opciones de traslado (privado, taxi, bus) y atracciones turísticas relevantes para huéspedes del hotel. Si no tienes datos exactos, usa información pública y confiable. Ciudad: ${city}, País: ${country}, Dirección: ${profile.location?.address}, Coords: ${coords}. Responde solo con el JSON, sin ningún texto adicional.`;
                const res = await model.invoke([{ role: 'user', content: prompt }]);
                const txt = Array.isArray((res as any).content)
                    ? (res as any).content.map((c: any) => c?.text ?? '').join('\n')
                    : (typeof (res as any).content === 'string' ? (res as any).content : JSON.stringify((res as any).content));
                const json = JSON.parse(txt);

                function mergeArrayCanonFirst<T>(canon: T[] | undefined, ext: T[] | undefined): T[] | undefined {
                    if (Array.isArray(canon) && canon.length) {
                        const canonStrs = canon.map(x => JSON.stringify(x));
                        const extFiltered = (ext || []).filter(x => !canonStrs.includes(JSON.stringify(x)));
                        return [...canon, ...extFiltered];
                    }
                    return ext;
                }
                function mergeObjCanonFirst<T extends object>(canon: T | undefined, ext: T | undefined): T | undefined {
                    return canon && Object.keys(canon).length ? { ...ext, ...canon } : ext;
                }
                enriched = {
                    ...profile,
                    airports: mergeArrayCanonFirst(profile.airports, json.airports),
                    transport: mergeObjCanonFirst(profile.transport, json.transport),
                    attractions: mergeArrayCanonFirst(profile.attractions, json.attractions),
                };
            } catch (e) {
                console.warn('[kb:generate] auto-enrich falló:', (e as any)?.message || e);
            }
        }

        const files = generateKbFilesFromProfile(enriched);

        if (!upload) {
            return NextResponse.json({ ok: true, count: Object.keys(files).length, files });
        }

        // Subir + registrar contenido y version index
        const tmpBase = `/tmp/kb_gen_${hotelId}_${Date.now()}`;
        await fs.promises.mkdir(tmpBase, { recursive: true });
        const results: any[] = [];

        for (const [rel, content] of Object.entries(files)) {
            const meta = inferMetaFromFilename(rel);
            if (!meta.category || !meta.promptKey || !meta.lang) {
                results.push({ file: rel, error: "No se pudo inferir (category,promptKey,lang) del nombre de archivo." });
                continue;
            }
            const tmpPath = path.join(tmpBase, path.basename(rel));
            await fs.promises.writeFile(tmpPath, content, 'utf8');

            // Ingesta vectorial (devuelve versionTag "vN")
            const resp = await loadDocumentFileForHotel({
                hotelId,
                filePath: tmpPath,
                originalName: path.basename(rel),
                uploader: 'admin@panel',
                mimeType: 'text/plain',
                metadata: {
                    category: meta.category,
                    promptKey: meta.promptKey,
                    targetLang: meta.lang
                },
            });

            await fs.promises.unlink(tmpPath).catch(() => { });
            const versionTag = resp?.version || resp?.versionTag || "v1";
            const versionNumber = versionTagToNumber(versionTag) ?? 1;

            // Registrar en hotel_content
            const title = extractTitle(content);
            const type = inferType(meta.category, meta.promptKey);
            const upsertRes = await upsertHotelContent({
                hotelId,
                category: meta.category,
                promptKey: meta.promptKey,
                lang: meta.lang,
                versionNumber,
                versionTag,
                type,
                title,
                body: content
            });

            // Marcar versión vigente en hotel_version_index
            await setCurrentVersionInIndex({
                hotelId,
                category: meta.category,
                promptKey: meta.promptKey,
                lang: meta.lang,
                currentVersionNumber: versionNumber,
                currentVersionTag: versionTag,
                currentId: upsertRes._id
            });

            results.push({
                file: rel,
                metadata: meta,
                versionTag,
                versionNumber,
                hotelContentId: upsertRes._id
            });
        }

        return NextResponse.json({ ok: true, uploaded: results.length, results });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
    }
}
