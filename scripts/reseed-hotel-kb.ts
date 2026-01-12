// Path: /root/begasist/scripts/reseed-hotel-kb.ts
/**
 * Reseed end-to-end: reset + scaffold (generate from hotelConfig) + ingest.
 * No crea colecciones nuevas; requiere que existan.
 * Dry-run (sin --apply): muestra plan y lista de archivos que se generarían.
 * Apply (--apply): ejecuta reset, genera archivos temporales y los ingesta.
 *
 * Uso:
 *   pnpm exec tsx scripts/reseed-hotel-kb.ts --hotel hotel999            (dry-run)
 *   pnpm exec tsx scripts/reseed-hotel-kb.ts --hotel hotel999 --apply     (ejecuta)
 *   Flags opcionales:
 *     --auto-enrich  (enriquecer perfil antes de scaffold)
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { getHotelConfig } from '../lib/config/hotelConfig.server';
import { generateKbFilesFromProfile, type Profile } from '../lib/kb/generator';
import { ChatOpenAI } from '@langchain/openai';
import { getAstraDB, getHotelAstraCollection, getCassandraClient } from '../lib/astra/connection';
import { loadDocumentFileForHotel } from '../lib/retrieval';
import { upsertHotelContent, normalizeVersionToTag, normalizeVersionToNumber } from '../lib/astra/hotelContent';
import { setCurrentVersionInIndex } from '../lib/astra/hotelVersionIndex';

type Args = { hotel: string; apply: boolean; auto: boolean };
function parseArgs(): Args {
    const a = process.argv.slice(2);
    let hotel = process.env.HOTEL_ID || 'hotel999';
    let apply = false;
    let auto = false;
    for (let i = 0; i < a.length; i++) {
        const x = a[i];
        if (x === '--hotel' && a[i + 1]) { hotel = a[++i]; continue; }
        if (x === '--apply') { apply = true; continue; }
        if (x === '--auto-enrich') { auto = true; continue; }
    }
    return { hotel, apply, auto };
}

async function resetHotel(hotelId: string) {
    // Reutiliza lógica simplificada de reset-hotel-kb.ts
    const vec = getHotelAstraCollection<any>(hotelId);
    try { await vec.deleteMany({ hotelId }); } catch { }
    const ks = process.env.ASTRA_DB_KEYSPACE!;
    const client = getCassandraClient();
    const tables = ['hotel_text_collection', 'hotel_content', 'hotel_version_index'];
    for (const t of tables) {
        try {
            await client.execute(`DELETE FROM "${ks}"."${t}" WHERE "hotelId"=?`, [hotelId], { prepare: true });
        } catch (e: any) {
            // Fallback row-wise
            try {
                if (t === 'hotel_text_collection') {
                    const sel = `SELECT "originalName", version, "chunkIndex" FROM "${ks}"."${t}" WHERE "hotelId"=? ALLOW FILTERING`;
                    const rs = await client.execute(sel, [hotelId], { prepare: true });
                    for (const row of rs.rows) {
                        await client.execute(`DELETE FROM "${ks}"."${t}" WHERE "hotelId"=? AND "originalName"=? AND version=? AND "chunkIndex"=?`, [hotelId, row.get('originalName'), row.get('version'), row.get('chunkIndex') ?? 0], { prepare: true });
                    }
                } else {
                    const sel = `SELECT category, "promptKey", lang FROM "${ks}"."${t}" WHERE "hotelId"=? ALLOW FILTERING`;
                    const rs = await client.execute(sel, [hotelId], { prepare: true });
                    for (const row of rs.rows) {
                        await client.execute(`DELETE FROM "${ks}"."${t}" WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=?`, [hotelId, row.get('category'), row.get('promptKey'), row.get('lang')], { prepare: true });
                    }
                }
            } catch { }
        }
    }
    await client.shutdown().catch(() => { });
}

function baseProfileFromConfig(cfg: any, hotelId: string): Profile {
    const safeLang = ((['es', 'en', 'pt'] as const).includes(cfg.defaultLanguage as any) ? cfg.defaultLanguage : 'es') as 'es' | 'en' | 'pt';
    return {
        hotelId,
        hotelName: cfg.hotelName,
        defaultLanguage: safeLang,
        timezone: cfg.timezone,
        location: { address: cfg.address || '', city: cfg.city || '', country: cfg.country || '' },
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
        airports: cfg as any,
        transport: cfg as any,
        attractions: cfg as any,
        rooms: cfg.rooms as any,
    };
}

async function enrichProfile(p: Profile): Promise<Profile> {
    try {
        const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
        const city = p.location?.city || '';
        const country = p.location?.country || '';
        const prompt = `Devuelve SOLO JSON {"airports":[],"transport":{},"attractions":[]} para hotel en ${city}, ${country}.`;
        const res = await model.invoke([{ role: 'user', content: prompt }]);
        const raw = typeof res.content === 'string' ? res.content : JSON.stringify(res.content);
        const json = JSON.parse(raw);
        return {
            ...p,
            airports: json.airports ?? p.airports,
            transport: json.transport ? { ...(p.transport || {}), ...json.transport } : p.transport,
            attractions: json.attractions ?? p.attractions,
        };
    } catch { return p; }
}

async function scaffoldFiles(profile: Profile) {
    return generateKbFilesFromProfile(profile); // { relativePath: content }
}

async function ingestFiles(hotelId: string, files: Record<string, string>) {
    const tmpBase = `/tmp/kb_reseed_${hotelId}_${Date.now()}`;
    await fs.promises.mkdir(tmpBase, { recursive: true });
    const results: Array<Record<string, any>> = [];
    for (const [rel, content] of Object.entries(files)) {
        const base = path.basename(rel);
        const dir = path.dirname(rel).replace(/^\.\/+/, '');
        const m = base.match(/^([a-z0-9_]+)\.([a-z]{2})\.txt$/i);
        if (!dir || !m) { results.push({ file: rel, error: 'No meta inferida' }); continue; }
        const promptKey = m[1];
        const lang = (m[2] as any) as 'es' | 'en' | 'pt';
        const category = dir.split(path.sep).pop()!;
        const tmpPath = path.join(tmpBase, base);
        await fs.promises.writeFile(tmpPath, content, 'utf8');
        const ingest = await loadDocumentFileForHotel({
            hotelId,
            filePath: tmpPath,
            originalName: base,
            enforcedCategory: category,
            enforcedPromptKey: promptKey,
            targetLang: lang,
            uploader: 'reseed-script',
            mimeType: 'text/plain',
            metadata: { category, promptKey, targetLang: lang }
        }).catch(e => ({ error: e?.message || String(e) }));
        await fs.promises.unlink(tmpPath).catch(() => { });
        if ((ingest as any).error) { results.push({ file: rel, error: (ingest as any).error }); continue; }
        const versionTag = normalizeVersionToTag((ingest as any).version || 'v1');
        const record = {
            hotelId,
            category,
            promptKey,
            lang,
            version: versionTag,
            type: ['reservation_flow', 'modify_reservation', 'reservation_snapshot', 'reservation_verify', 'ambiguity_policy'].includes(promptKey) ? 'playbook' : 'standard',
            title: (() => { const m = content.match(/^#\s+(.+)/m); return m ? m[1].trim() : undefined; })(),
            body: content,
        } as const;
        const up = await upsertHotelContent(record as any);
        await setCurrentVersionInIndex({ hotelId, category, promptKey, lang, currentVersion: versionTag });
        results.push({ file: rel, category, promptKey, lang, versionTag, hotelContentId: up.id });
    }
    return results;
}

async function main() {
    const { hotel, apply, auto } = parseArgs();
    console.log(`[reseed] hotelId=${hotel} mode=${apply ? 'APPLY' : 'DRY-RUN'} autoEnrich=${auto}`);
    const cfg = await getHotelConfig(hotel);
    if (!cfg) { console.error(`[reseed] ❌ Hotel config no encontrado para ${hotel}`); process.exit(2); }
    let profile = baseProfileFromConfig(cfg, hotel);
    if (auto) { profile = await enrichProfile(profile); }
    const files = await scaffoldFiles(profile);
    console.log(`[reseed] Scaffold: ${Object.keys(files).length} archivos generados en memoria.`);
    if (!apply) {
        console.log('[reseed] DRY-RUN: no se ejecuta reset ni ingest. Listado parcial:');
        for (const k of Object.keys(files).slice(0, 10)) console.log('  -', k);
        if (Object.keys(files).length > 10) console.log('  ...');
        return;
    }
    console.log('[reseed] Ejecutando reset previo...');
    await resetHotel(hotel);
    console.log('[reseed] Ingestando archivos...');
    const res = await ingestFiles(hotel, files);
    const ok = res.filter(r => !r.error).length;
    const fail = res.filter(r => r.error).length;
    console.log(`[reseed] ✅ Ingesta completada. OK=${ok} FAIL=${fail}`);
    if (fail) {
        console.log('[reseed] Errores:');
        res.filter(r => r.error).forEach(r => console.log('  -', r.file, r.error));
    }
}

main().catch(e => { console.error('[reseed] ❌ Error:', e); process.exit(1); });
