// Path: /root/begasist/scripts/seed_system_playbook.ts
import "dotenv/config";
import { createReadStream, statSync } from "fs";
import * as readline from "readline";
import OpenAI from "openai";
import { getAstraDB } from "../lib/astra/connection";

const COLLECTION = "system_playbook";
const EMBEDDING_MODEL = "text-embedding-ada-002";
const SEED_PATH = "/root/begasist/seeds/system_playbook.seed.jsonl";

type SeedDoc = { _id: string; text: string; [k: string]: any };

function resolveAstraParams(conn: any) {
  const baseUrl = conn?.baseUrl || conn?.url || process.env.ASTRA_DB_URL;
  const keyspace = conn?.keyspace || process.env.ASTRA_DB_KEYSPACE;
  const token = conn?.token || conn?.applicationToken || process.env.ASTRA_DB_APPLICATION_TOKEN;
  if (!baseUrl || !keyspace || !token) throw new Error("Parámetros Astra incompletos.");
  return { baseUrl, keyspace, token };
}

async function postCmd(baseUrl: string, keyspace: string, token: string, path: string, body: any) {
  const url = `${baseUrl}/api/json/v1/${keyspace}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Token: token },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`${url} → ${res.status} ${txt}`);
  return JSON.parse(txt);
}

async function ensureCollection(baseUrl: string, keyspace: string, token: string) {
  const out = await postCmd(baseUrl, keyspace, token, "", { findCollections: { options: { explain: false } } });
  const names: string[] = out?.status?.collections ?? [];
  if (!names.includes(COLLECTION)) throw new Error(`Colección '${COLLECTION}' no existe en '${keyspace}'.`);
}

async function* readJsonl(path: string) {
  const rl = readline.createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  for await (const line of rl) {
    const s = line.trim();
    if (!s || s.startsWith("//")) continue;
    yield JSON.parse(s);
  }
}

(async function main() {
  console.log("[seed] START");
  // Chequeo seed
  try { const st = statSync(SEED_PATH); console.log("[seed] seed file:", SEED_PATH, "size:", st.size); }
  catch { console.error("[seed] ❌ Seed no encontrado:", SEED_PATH); process.exit(1); }

  if (!process.env.OPENAI_API_KEY) { console.error("[seed] ❌ Falta OPENAI_API_KEY"); process.exit(1); }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Astra
  const conn = await getAstraDB();
  const { baseUrl, keyspace, token } = resolveAstraParams(conn);
  console.log("[seed] astra:", { baseUrl, keyspace, token: token ? "OK" : "MISSING" });
  await ensureCollection(baseUrl, keyspace, token);
  console.log("[seed] ✅ Collection existe:", COLLECTION);

  // Leer docs
  const docs: SeedDoc[] = [];
  for await (const obj of readJsonl(SEED_PATH)) {
    if (!obj._id || !obj.text) { console.warn("[seed] ⚠️ Doc inválido (falta _id o text):", obj); continue; }
    docs.push(obj);
  }
  console.log("[seed] docs a procesar:", docs.length);
  if (docs.length === 0) { console.error("[seed] ❌ Seed vacío"); process.exit(1); }

  // Embed + upsert (updateOne con upsert:true y $vector)
  for (const d of docs) {
    console.log("[seed] embedding:", d._id);
    const e = await openai.embeddings.create({ model: EMBEDDING_MODEL, input: d.text });
    const vec = e.data[0].embedding;

    console.log("[seed] upsert:", d._id);
    await postCmd(baseUrl, keyspace, token, `/${COLLECTION}`, {
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { ...d, $vector: vec } },
        options: { upsert: true },
      },
    });
    console.log("✔️", d._id);
  }
  console.log(`\n🎯 Listo. Documentos procesados: ${docs.length}`);
})().catch((e) => { console.error("❌ Error:", e.message || e); process.exit(1); });
