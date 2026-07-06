import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { promises as fs } from "fs";
import path from "path";
import { verifyJWT } from "@/lib/auth/jwt";
import { getAstraDB, getCassandraClient, getHotelAstraCollection } from "@/lib/astra/connection";
import { getCurrentVersionFromIndex } from "@/lib/astra/hotelVersionIndex";
import { normalizeVersionToTag } from "@/lib/astra/hotelContent";
import { loadDocumentFileForHotel } from "@/lib/retrieval";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { hydrateTextFromConfig } from "@/lib/kb/hydrateFromConfig";

function normalize(v: string | null | undefined) {
  return (v ?? "").trim().replace(/^"([\s\S]*)"$/, "$1").replace(/^'([\s\S]*)'$/, "$1");
}

function parseVersionNum(v: unknown): number {
  const s = String(v ?? "");
  const m = s.match(/^v(\d+)$/i);
  if (m) return Number(m[1]) || 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: NextRequest) {
  const search = new URL(req.url).searchParams;
  const hdrKey = normalize(req.headers.get("x-admin-key"));
  const qpKey = normalize(search.get("x-admin-key") || search.get("admin_key") || search.get("adminKey"));
  const providedKey = hdrKey || qpKey;
  const envKey = normalize(process.env.ADMIN_API_KEY);
  const headerAuthOk = !!envKey && providedKey === envKey;

  let cookieAuthOk = false;
  const token = req.cookies.get("token")?.value;
  if (token) {
    const payload = await verifyJWT(token);
    cookieAuthOk = !!payload;
  }
  if (!headerAuthOk && !cookieAuthOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const hotelId = normalize(body?.hotelId);
  const categoryId = normalize(body?.categoryId);
  const lang = normalize(body?.lang || "es").toLowerCase();
  const clearPrevious = body?.clearPrevious !== false;

  if (!hotelId || !categoryId || !categoryId.includes("/")) {
    return NextResponse.json({ error: "hotelId y categoryId requeridos" }, { status: 400 });
  }
  if (!["es", "en", "pt"].includes(lang)) {
    return NextResponse.json({ error: "lang inválido (es|en|pt)" }, { status: 400 });
  }

  const [category, promptKey] = categoryId.split("/");

  let sourceBody = "";
  let sourceVersion: string | null = null;
  try {
    const db = await getAstraDB();
    const col = db.collection<any>("hotel_content");
    let preferredVersion: string | undefined;
    try {
      const idx = await getCurrentVersionFromIndex(hotelId, category, promptKey, lang);
      if (idx?.currentVersion) preferredVersion = normalizeVersionToTag(idx.currentVersion as any);
    } catch {
      preferredVersion = undefined;
    }

    let doc: any = null;
    if (preferredVersion) {
      doc = await col.findOne({ hotelId, category, promptKey, lang, version: preferredVersion });
    }
    if (!doc) {
      const all = await col.find({ hotelId, category, promptKey, lang }).toArray();
      if (Array.isArray(all) && all.length) {
        doc = all.sort((a, b) => parseVersionNum(b?.version) - parseVersionNum(a?.version))[0];
      }
    }
    if (doc?.body) {
      sourceBody = String(doc.body);
      sourceVersion = doc.version ? String(doc.version) : null;
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    if (!/Collection does not exist/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    try {
      const client = getCassandraClient();
      const rs = await client.execute(
        `SELECT body, version FROM "${process.env.ASTRA_DB_KEYSPACE}"."hotel_content"
         WHERE "hotelId"=? AND category=? AND "promptKey"=? AND lang=? ALLOW FILTERING`,
        [hotelId, category, promptKey, lang],
        { prepare: true }
      );
      const rows = (rs.rows || []).slice().sort((a, b) => parseVersionNum(b.get("version")) - parseVersionNum(a.get("version")));
      const row = rows[0];
      if (row) {
        sourceBody = String(row.get("body") || "");
        sourceVersion = row.get("version") ? String(row.get("version")) : null;
      }
    } catch (err: any) {
      return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
    }
  }

  if (!sourceBody.trim()) {
    return NextResponse.json({ error: `No hay contenido hotel para ${categoryId} (${lang})` }, { status: 404 });
  }

  // Hidratamos tokens con hotel_config para indexar texto útil (no tokens [[key: ...]]).
  let hydratedBody = sourceBody;
  try {
    const cfg = await getHotelConfig(hotelId);
    if (cfg) hydratedBody = hydrateTextFromConfig(sourceBody, cfg);
  } catch {
    hydratedBody = sourceBody;
  }
  // Limpieza defensiva: si quedaron tokens no resueltos, no los vectorizamos.
  hydratedBody = hydratedBody.replace(/\[\[[\s\S]*?\]\]/g, " ").replace(/\s{2,}/g, " ").trim();

  const tmp = path.join("/tmp", `kb_vec_${hotelId}_${category}_${promptKey}_${lang}_${Date.now()}.txt`);
  let deleted = 0;
  try {
    await fs.writeFile(tmp, hydratedBody, "utf8");

    if (clearPrevious) {
      try {
        const vecCol = await getHotelAstraCollection<any>(hotelId);
        const delRes = await vecCol.deleteMany({ hotelId, category, promptKey, targetLang: lang });
        deleted = Number(delRes?.deletedCount || 0);
      } catch {
        deleted = 0;
      }
    }

    const load = await loadDocumentFileForHotel({
      hotelId,
      filePath: tmp,
      originalName: `${promptKey}.${lang}.txt`,
      enforcedCategory: category,
      enforcedPromptKey: promptKey,
      targetLang: lang,
      versionOverride: sourceVersion ?? undefined,
      uploader: "admin@panel",
      mimeType: "text/plain",
      metadata: {
        fromHotelContent: true,
        sourceVersion: sourceVersion ?? undefined,
      },
    });

    return NextResponse.json({
      ok: true,
      hotelId,
      categoryId,
      lang,
      sourceVersion,
      deleted,
      indexed: load?.count ?? 0,
      vectorVersion: load?.version ?? null,
      versionAligned: sourceVersion ? normalizeVersionToTag(sourceVersion) === normalizeVersionToTag(load?.version ?? null) : null,
    });
  } finally {
    try { await fs.unlink(tmp); } catch { }
  }
}
