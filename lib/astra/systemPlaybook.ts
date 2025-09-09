// Path: /root/begasist/lib/astra/systemPlaybook.ts
import { getAstraDB } from "@/lib/astra/connection";

export type SystemPlaybookDoc = {
  _id: string;
  text: string;
  category: string;
  promptKey: string;          // p.ej. "reservation_flow" | "modify_reservation" | "ambiguity_policy"
  language?: string | null;   // legacy ("spa", etc.)
  langIso1?: string | null;   // "es" | "en" | ...
  version?: string | null;    // "v1" | "v2"...
  uploader?: string | null;
  author?: string | null;
  uploadedAt?: string | null; // ISO
  notes?: string | null;
};

const COLL = "system_playbook";

/** Obtiene el último doc por promptKey (+ opcional langIso1), según uploadedAt desc. */
export async function getSystemPlaybookByPromptKey(
  promptKey: string,
  langIso1?: string
): Promise<SystemPlaybookDoc | null> {
  const db = getAstraDB();
  const c = db.collection<SystemPlaybookDoc>(COLL);
  const filter: Record<string, any> = { promptKey };
  if (langIso1) filter.langIso1 = langIso1;

  const cursor = await c.find(filter, { sort: { uploadedAt: -1 }, limit: 1 });
  const docs = await cursor.toArray();
  return (docs?.[0] as any)?.document ?? null;
}

/** Obtiene varios playbooks a la vez. Devuelve un map { key: doc|null } */
export async function getSystemPlaybooks(
  keys: string[],
  langIso1?: string
): Promise<Record<string, SystemPlaybookDoc | null>> {
  const result: Record<string, SystemPlaybookDoc | null> = {};
  for (const k of keys) result[k] = null;
  if (keys.length === 0) return result;

  const db = getAstraDB();
  const c = db.collection<SystemPlaybookDoc>(COLL);
  const filter: Record<string, any> = { promptKey: { $in: keys } };
  if (langIso1) filter.langIso1 = langIso1;

  const cursor = await c.find(filter, { sort: { uploadedAt: -1 }, limit: 50 });
  const rows = await cursor.toArray();

  // nos quedamos con el más nuevo por promptKey
  for (const row of rows as any[]) {
    const doc = row?.document as SystemPlaybookDoc | undefined;
    if (!doc?.promptKey) continue;
    const k = doc.promptKey;
    if (!result[k]) result[k] = doc;
  }
  return result;
}

/** Calcula la próxima versión "vN" para (promptKey, langIso1). */
export async function getNextVersionForSystemPlaybook(
  promptKey: string,
  langIso1: string
): Promise<string> {
  const db = getAstraDB();
  const c = db.collection<SystemPlaybookDoc>(COLL);
  const cur = await c.find({ promptKey, langIso1 });
  const all = await cur.toArray();

  let maxV = 0;
  for (const row of all as any[]) {
    const v = (row?.document?.version || "") as string;
    const m = v.match(/^v(\d+)$/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxV) maxV = n;
    }
  }
  return `v${maxV + 1}`;
}

/** Upsert por _id (idéntico al que venías usando). */
export async function upsertSystemPlaybookDoc(doc: SystemPlaybookDoc) {
  const db = getAstraDB();
  const c = db.collection<SystemPlaybookDoc>(COLL);
  await c.updateOne(
    { _id: doc._id },
    { $set: doc },
    { upsert: true }
  );
}

export async function getLatestPlaybook(params: { promptKey: string; langIso1: string }): Promise<SystemPlaybookDoc | null> {
  const { promptKey, langIso1 } = params;
  const db = getAstraDB();
  const c = db.collection<SystemPlaybookDoc>(COLL);
  const cursor = await c.find({ promptKey, langIso1 }, { sort: { uploadedAt: -1 }, limit: 1 });
  const docs = await cursor.toArray();
  return (docs?.[0] as any)?.document ?? null;
}