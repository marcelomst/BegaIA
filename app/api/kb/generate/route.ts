// Path: /root/begasist/app/api/kb/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import * as fs from 'fs';
import * as path from 'path';
import { getHotelConfig } from '@/lib/config/hotelConfig.server';
import { loadDocumentFileForHotel } from '@/lib/retrieval';
import { ChatOpenAI } from '@langchain/openai';
import { buildHydrationConfigFromProfile, generateKbFilesFromTemplates, type Profile } from '@/lib/kb/generator';
import {
  upsertHotelContent,
  normalizeVersionToNumber,
  normalizeVersionToTag
} from '@/lib/astra/hotelContent';
import { setCurrentVersionInIndex } from '@/lib/astra/hotelVersionIndex';
import type { HotelContent } from '@/types/hotelContent';
import { getAstraDB } from '@/lib/astra/connection';
import { assertAstraCollectionsExist } from "@/lib/astra/bootstrap";
import { getCollectionName } from '@/lib/retrieval';
// 👇 importa tu verifyJWT para validar cookie
import { verifyJWT } from "@/lib/auth/jwt";

function inferType(category: string, promptKey: string): HotelContent["type"] {
  const PLAYBOOK_KEYS = new Set([
    "reservation_flow",
    "modify_reservation",
    "reservation_snapshot",
    "reservation_verify",
    "ambiguity_policy",
  ]);
  return PLAYBOOK_KEYS.has(promptKey) ? "playbook" : "standard";
}

function inferMetaFromFilename(rel: string): { category?: string; promptKey?: string; lang?: 'es' | 'en' | 'pt' } {
  const base = path.basename(rel);
  const dir = path.dirname(rel).replace(/^\.\/+/, '');
  const m = base.match(/^([a-z0-9_]+)\.([a-z]{2})\.txt$/i);
  if (!dir || !m) return {};
  const promptKey = m[1];
  const lang = (m[2] as any) as 'es' | 'en' | 'pt';
  const category = dir.split(path.sep).pop();
  return { category, promptKey, lang };
}

function extractTitle(body: string): string | undefined {
  const m = body.match(/^\s*#\s+(.+)\s*$/m);
  return m ? m[1].trim() : undefined;
}

async function ensureCategoryRegistered(args: {
  category: string;
  promptKey: string;
  name?: string;
}) {
  const db = await getAstraDB();
  const categoryId = `${args.category}/${args.promptKey}`;
  const coll = db.collection('category_registry');
  try {
    const existing = await coll.findOne({ categoryId });
    if (existing) return { ok: true, categoryId, existed: true };

    const now = new Date().toISOString();
    // Insert compatible tanto con Document API como con tabla CQL subyacente
    await coll.insertOne({
      categoryId,
      name: args.name ?? args.promptKey,
      enabled: true,
      router: { category: args.category, promptKey: args.promptKey },
      retriever: { topK: 6, filters: { category: args.category, promptKey: args.promptKey, status: "active" } },
      intents: [],
      templates: {},
      fallback: "qa",
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    return { ok: true, categoryId, created: true };
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!/Collection does not exist/i.test(msg)) throw e;
    // Fallback CQL
    const { getCassandraClient } = await import('@/lib/astra/connection');
    const client = getCassandraClient();
    // Verificar existencia
    const sel = await client.execute(
      `SELECT "categoryId" FROM "${process.env.ASTRA_DB_KEYSPACE}"."category_registry" WHERE "categoryId"=? LIMIT 1`,
      [categoryId], { prepare: true }
    );
    if (sel.rowLength > 0) return { ok: true, categoryId, existed: true };
    const now = new Date();
    await client.execute(
      `INSERT INTO "${process.env.ASTRA_DB_KEYSPACE}"."category_registry"
       ("categoryId", name, enabled, "routerCategory", "routerPromptKey", "retrieverTopK", "retrieverFilters", intents, templates, fallback, version, "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [categoryId, args.name ?? args.promptKey, true, args.category, args.promptKey, 6, { category: args.category, promptKey: args.promptKey, status: 'active' }, [], {}, 'qa', 1, now, now],
      { prepare: true }
    );
    return { ok: true, categoryId, created: true };
  }
}

export async function POST(req: NextRequest) {
  // 1) auth por header o query (scripts / curl)
  const normalize = (v: string | null | undefined) =>
    (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
  const search = new URL(req.url).searchParams;
  const hdrKey = normalize(req.headers.get("x-admin-key"));
  const qpKey = normalize(search.get("x-admin-key") || search.get("admin_key") || search.get("adminKey"));
  const providedKey = hdrKey || qpKey;
  const envKey = normalize(process.env.ADMIN_API_KEY);
  const headerAuthOk = !!envKey && providedKey === envKey;

  // 2) auth por cookie (panel)
  let cookieAuthOk = false;
  const token = req.cookies.get("token")?.value;
  if (token) {
    const payload = await verifyJWT(token);
    cookieAuthOk = !!payload;
  }

  if (!headerAuthOk && !cookieAuthOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Nota: no creamos colecciones automáticamente en este proyecto.
  // Solo verificamos existencia más abajo, cuando conozcamos el hotelId.

  try {
    const parsed = await req.json();
    const { hotelId, autoEnrich = false, upload = true, overrides } = parsed || {};
    if (!hotelId) return NextResponse.json({ error: 'hotelId requerido' }, { status: 400 });

    const cfg = await getHotelConfig(hotelId);
    if (!cfg) return NextResponse.json({ error: 'Hotel no encontrado' }, { status: 404 });

    // 3) Verificar que existan las colecciones requeridas (no crear)
    // Nota: solo verificamos cuando upload=true. Para preview (upload=false), no exigimos colecciones.
    if (upload) {
      try {
        const hotelVectorCollection = getCollectionName(hotelId);
        // Para esta ruta, solo exigimos la colección vectorial del hotel.
        // El resto (category_registry, hotel_text_collection, hotel_version_index) tienen fallback CQL.
        await assertAstraCollectionsExist([hotelVectorCollection]);
      } catch (e: any) {
        return NextResponse.json(
          { error: 'Astra collections missing', detail: String(e?.message || e) },
          { status: 500 }
        );
      }
    }

    const safeLang = ((['es', 'en', 'pt'] as const).includes((cfg.defaultLanguage as any))
      ? (cfg.defaultLanguage as any)
      : 'es');
    const profile: Profile = {
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
      airports: cfg as any as Profile['airports'],
      transport: cfg as any as Profile['transport'],
      attractions: cfg as any as Profile['attractions'],
      rooms: cfg.rooms as any,
    };

    const mergeDefined = <T extends Record<string, any>>(base: T, extra?: Partial<T>): T => {
      if (!extra) return base;
      const out = { ...(base as any) };
      for (const [k, v] of Object.entries(extra)) {
        if (v !== undefined) (out as any)[k] = v;
      }
      return out as T;
    };

    const merged: Profile = {
      ...profile,
      hotelName: overrides?.hotelName ?? profile.hotelName,
      defaultLanguage: overrides?.defaultLanguage ?? profile.defaultLanguage,
      timezone: overrides?.timezone ?? profile.timezone,
      location: mergeDefined(
        profile.location || {},
        (overrides?.location || { address: overrides?.address, city: overrides?.city, country: overrides?.country } as any)
      ),
      contacts: mergeDefined(profile.contacts || {}, overrides?.contacts),
      schedules: mergeDefined(profile.schedules || {}, overrides?.schedules),
      amenities: mergeDefined(profile.amenities || {}, overrides?.amenities),
      payments: mergeDefined(profile.payments || {}, overrides?.payments),
      billing: mergeDefined(profile.billing || {}, overrides?.billing),
      policies: mergeDefined(profile.policies || {}, overrides?.policies),
      rooms: (overrides?.rooms as any) ?? profile.rooms,
    };

    let enriched = merged;
    if (autoEnrich) {
      try {
        const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
        const city = profile.location?.city || '';
        const country = profile.location?.country || '';
        const coords = profile.location?.coordinates ? `${profile.location.coordinates.lat},${profile.location.coordinates.lng}` : '';
        const prompt = `Eres un asistente experto en turismo y hotelería. Devuelve SOLO JSON válido (sin explicaciones) {"airports":[...],"transport":{...},"attractions":[...]}. Ciudad: ${city}, País: ${country}, Dirección: ${profile.location?.address}, Coords: ${coords}.`;
        const res = await model.invoke([{ role: 'user', content: prompt }]);
        const raw = Array.isArray((res as any).content)
          ? (res as any).content.map((c: any) => c?.text ?? '').join('\n')
          : (typeof (res as any).content === 'string' ? (res as any).content : JSON.stringify((res as any).content));
        const json = JSON.parse(raw);

        const mergeArr = <T,>(canon?: T[], ext?: T[]) =>
          (Array.isArray(canon) && canon.length)
            ? [...canon, ...((ext || []).filter(x => !canon.some(c => JSON.stringify(c) === JSON.stringify(x))))] : ext;
        const mergeObj = <T extends object>(canon?: T, ext?: T) =>
          (canon && Object.keys(canon).length ? { ...ext, ...canon } : ext);

        enriched = {
          ...profile,
          airports: mergeArr(profile.airports, json.airports),
          transport: mergeObj(profile.transport, json.transport),
          attractions: mergeArr(profile.attractions, json.attractions),
        };
      } catch (e) {
        console.warn('[kb:generate] auto-enrich falló:', (e as any)?.message || e);
      }
    }

    const hydrationFromProfile = buildHydrationConfigFromProfile(enriched);
    const hydrationConfig = {
      ...cfg,
      ...hydrationFromProfile,
      address: hydrationFromProfile.address || cfg.address,
      city: hydrationFromProfile.city || cfg.city,
      country: hydrationFromProfile.country || cfg.country,
      contacts: { ...(cfg.contacts || {}), ...(hydrationFromProfile.contacts || {}) },
      schedules: { ...(cfg.schedules || {}), ...(hydrationFromProfile.schedules || {}) },
      amenities: { ...(cfg.amenities || {}), ...(hydrationFromProfile.amenities || {}) },
      payments: { ...(cfg.payments || {}), ...(hydrationFromProfile.payments || {}) },
      billing: { ...(cfg.billing || {}), ...(hydrationFromProfile.billing || {}) },
      policies: { ...(cfg.policies || {}), ...(hydrationFromProfile.policies || {}) },
      airports: hydrationFromProfile.airports || (cfg as any).airports,
      transport: hydrationFromProfile.transport || (cfg as any).transport,
      attractions: hydrationFromProfile.attractions || (cfg as any).attractions,
      rooms: hydrationFromProfile.rooms || cfg.rooms,
      hotelProfile: { ...(cfg as any).hotelProfile, ...(hydrationFromProfile as any).hotelProfile },
    };
    const files = generateKbFilesFromTemplates({ hotelConfig: hydrationConfig, defaultLanguage: safeLang });

    // solo preview
    if (!upload) {
      return NextResponse.json({ ok: true, count: Object.keys(files).length, files });
    }

    const tmpBase = `/tmp/kb_gen_${hotelId}_${Date.now()}`;
    await fs.promises.mkdir(tmpBase, { recursive: true });
    const results: any[] = [];

    for (const [rel, content] of Object.entries(files)) {
      const meta = inferMetaFromFilename(rel);
      if (!meta.category || !meta.promptKey || !meta.lang) {
        results.push({ file: rel, error: "No se pudo inferir (category,promptKey,lang) del nombre de archivo." });
        continue;
      }

      await ensureCategoryRegistered({ category: meta.category, promptKey: meta.promptKey });

      const tmpPath = path.join(tmpBase, path.basename(rel));
      await fs.promises.writeFile(tmpPath, content, 'utf8');

      const ingest = await loadDocumentFileForHotel({
        hotelId,
        filePath: tmpPath,
        originalName: path.basename(rel),
        enforcedCategory: meta.category,
        enforcedPromptKey: meta.promptKey,
        targetLang: meta.lang,
        uploader: 'admin@panel',
        mimeType: 'text/plain',
        metadata: { category: meta.category, promptKey: meta.promptKey, targetLang: meta.lang },
      }).catch((e: any) => ({ error: e?.message || String(e) }));

      await fs.promises.unlink(tmpPath).catch(() => { });
      if ((ingest as any)?.error) {
        results.push({ file: rel, error: (ingest as any).error });
        continue;
      }

      const versionTag = normalizeVersionToTag((ingest as any)?.version || (ingest as any)?.versionTag || "v1");
      const versionNumber = normalizeVersionToNumber(versionTag);

      const record: HotelContent = {
        hotelId,
        category: meta.category,
        promptKey: meta.promptKey,
        lang: meta.lang,
        version: versionTag,
        type: inferType(meta.category, meta.promptKey),
        title: extractTitle(content),
        body: content,
      };
      const up = await upsertHotelContent(record);

      await setCurrentVersionInIndex({
        hotelId,
        category: meta.category,
        promptKey: meta.promptKey,
        lang: meta.lang,
        currentVersion: versionTag,
      });

      results.push({
        file: rel,
        metadata: meta,
        versionTag,
        versionNumber,
        hotelContentId: up.id,
      });
    }

    return NextResponse.json({ ok: true, uploaded: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error' }, { status: 500 });
  }
}
