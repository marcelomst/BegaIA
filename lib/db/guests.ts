// Path: /root/begasist/lib/db/guests.ts

import type { Guest, Identifier } from "@/types/channel";

import { getAstraDB } from "@/lib/astra/connection";

const GUESTS_COLLECTION = "guests";
// map de campos -> type del historial
const FIELD_TO_TYPE: Record<string, Identifier["type"]> = {
  email: "email",
  whatsappId: "wa",
  phoneE164: "phone",
  doc: "doc",
  web_id: "web_id",
};

// helper para producir registros de historial
function buildHistoryAdds(add: {
  email?: string;
  whatsappId?: string;
  phoneE164?: string;
  doc?: string;
  web_id?: string;
}, src?: Identifier["source"]): Identifier[] {
  const out: Identifier[] = [];
  for (const [k, v] of Object.entries(add)) {
    if (!v) continue;
    const type = FIELD_TO_TYPE[k as keyof typeof FIELD_TO_TYPE];
    if (!type) continue;
    out.push({ type, value: v, source: src, verified: src === "pms" });
  }
  return out;
}

function getGuestsCollection() {
  return getAstraDB().collection<Guest>(GUESTS_COLLECTION);
}
function normalizeDoc(s?: string | null) {
  const v = norm(s).replace(/\s+/g, "").toUpperCase();
  return v || undefined;
}
function normalizeWebId(s?: string | null) {
  const v = norm(s);
  return v || undefined;
}

/** Normalizadores simples (best-effort, sin librerías extra) */
function norm(s?: string | null) {
  return (s ?? "").trim();
}
function isEmail(s?: string | null) {
  return !!s && /\S+@\S+\.\S+/.test(s);
}
function normalizeEmail(s?: string | null) {
  const v = norm(s).toLowerCase();
  return isEmail(v) ? v : undefined;
}
/** WhatsApp ID tal como lo entrega whatsapp-web.js (ej: 5989xxxxx@c.us) */
function normalizeWhatsAppId(s?: string | null) {
  const v = norm(s);
  return v || undefined;
}
function normalizePhoneE164(s?: string | null) {
  const v = norm(s).replace(/[^\d+]/g, "");
  return v || undefined;
}
function unique<T>(arr: T[]) {
  return Array.from(new Set(arr.filter(Boolean))) as T[];
}

/** Búsqueda directa por (hotelId, guestId) */
export async function getGuest(hotelId: string, guestId: string): Promise<Guest | null> {
  const col = getGuestsCollection();
  return await col.findOne({ hotelId, guestId });
}

export async function createGuest(guest: Guest): Promise<Guest> {
  const col = getGuestsCollection();
  await col.insertOne(guest);
  return guest;
}

export async function updateGuest(hotelId: string, guestId: string, changes: Partial<Guest>): Promise<void> {
  const col = getGuestsCollection();
  await col.updateOne(
    { hotelId, guestId },
    { $set: { ...changes, updatedAt: new Date().toISOString() } }
  );
}

export async function findGuestsByHotel(hotelId: string): Promise<Guest[]> {
  const col = getGuestsCollection();
  return await col.find({ hotelId }).toArray();
}

export async function deleteGuest(hotelId: string, guestId: string): Promise<void> {
  const col = getGuestsCollection();
  await col.deleteOne({ hotelId, guestId });
}

/** 🧠 Buscar por cualquier identificador conocido (guestId, alias, email, whatsappId, phoneE164) */
export async function findGuestByAnyId(hotelId: string, anyId: string): Promise<Guest | null> {
  const col = getGuestsCollection();
  const raw = (anyId ?? "").trim();
  if (!raw) return null;

  // 1) Match directo y por alias
  const direct = await col.findOne({ hotelId, guestId: raw });
  if (direct) return direct;

  const aliased = await col.findOne({ hotelId, aliases: raw } as any);
  if (aliased) return aliased;

  // 2) Candidatos normalizados (email/wa/phone/doc/web_id)
  const candidates = new Set<string>();
  candidates.add(raw);

  const em = normalizeEmail(raw);           if (em) candidates.add(em);
  const wa = normalizeWhatsAppId(raw);      if (wa) candidates.add(wa);
  const ph = normalizePhoneE164(raw);       if (ph) candidates.add(ph);
  const dc = normalizeDoc(raw);             if (dc) candidates.add(dc);
  const wid = normalizeWebId(raw);          if (wid) candidates.add(wid);

  // 3) Buscar en primarios (identifiers.*) y, por compat, en campos planos email/phone
  const primaryOr: any[] = [];
  for (const v of candidates) {
    primaryOr.push(
      { "identifiers.email": v },
      { "identifiers.whatsappId": v },
      { "identifiers.phoneE164": v },
      { "identifiers.doc": v },
      { "identifiers.web_id": v },
      { email: v },     // legacy/compat
      { phone: v }      // legacy/compat
    );
  }

  const byPrimary = await col.findOne({ hotelId, $or: primaryOr } as any);
  if (byPrimary) return byPrimary;

  // 4) Buscar en historial (identifiersHistory.value) con cualquiera de los candidatos
  const historyOr = Array.from(candidates).map((v) => ({ "identifiersHistory.value": v }));
  const byHistory = await col.findOne({ hotelId, $or: historyOr } as any);
  if (byHistory) return byHistory;

  return null;
}



/** Añadir alias/identifiers si faltan (sin $addToSet para evitar incompatibilidades) */
async function upsertAliasesAndIdentifiers(
  hotelId: string,
  guest: Guest,
  additions: {
    aliases?: string[];
    email?: string;
    whatsappId?: string;
    phoneE164?: string;
    doc?: string;
    web_id?: string;
    source?: Identifier["source"];
  }
) {
  const col = getGuestsCollection();

  // calcular next primarios
  const nextIdentifiers = {
    email: guest.identifiers?.email ?? additions.email,
    whatsappId: guest.identifiers?.whatsappId ?? additions.whatsappId,
    phoneE164: guest.identifiers?.phoneE164 ?? additions.phoneE164,
    doc: guest.identifiers?.doc ?? additions.doc,
    web_id: guest.identifiers?.web_id ?? additions.web_id,
    primary: guest.identifiers?.primary, // opcional
  };

  const nextAliases = unique([...(guest.aliases ?? []), ...(additions.aliases ?? [])]);


  // historial “append” en memoria para luego $set
  const histAdds = buildHistoryAdds(
    {
      email: additions.email,
      whatsappId: additions.whatsappId,
      phoneE164: additions.phoneE164,
      doc: additions.doc,
      web_id: additions.web_id,
    },
    additions.source
  );

  const nextHistory = [
    ...(guest.identifiersHistory ?? []),
    ...histAdds,
  ];

  await col.updateOne(
    { hotelId, guestId: guest.guestId },
    {
      $set: {
        aliases: nextAliases.length ? nextAliases : undefined,
        identifiers: nextIdentifiers,
        identifiersHistory: nextHistory.length ? nextHistory : undefined,
        // campos planos por conveniencia (si no existían):
        email: guest.email ?? additions.email,
        phone: guest.phone ?? additions.phoneE164,
        updatedAt: new Date().toISOString(),
      },
    }
  );
}


/** Elegir un ID canónico (preferimos email, luego whatsappId, luego phone, luego rawId) */
function pickCanonicalId(ids: { rawId: string; email?: string; whatsappId?: string; phoneE164?: string }) {
  return normalizeEmail(ids.email)
    || normalizeWhatsAppId(ids.whatsappId)
    || normalizePhoneE164(ids.phoneE164)
    || norm(ids.rawId);
}

/**
 * 🔧 Resolver/crear un perfil canónico para el huésped.
 * - Busca por guestId directo, alias o identifiers.
 * - Si no existe, crea uno nuevo con aliases e identifiers.
 * - Si existe, agrega alias/identifiers faltantes.
 */
export async function resolveGuestProfile(
  hotelId: string,
  ids: {
    rawId: string;
    email?: string;
    whatsappId?: string;
    phoneE164?: string;
    doc?: string;
    web_id?: string;
    source?: Identifier["source"];
  },
  defaults?: Partial<Guest>
): Promise<Guest> {

  const rawId = norm(ids.rawId);
  const email = normalizeEmail(ids.email);
  const waId = normalizeWhatsAppId(ids.whatsappId);
  const phone = normalizePhoneE164(ids.phoneE164);
  const doc = normalizeDoc(ids.doc);
  const web_id = normalizeWebId(ids.web_id);


  // 1) ¿ya existe por cualquiera de los IDs?
  const found =
    (await findGuestByAnyId(hotelId, rawId)) ||
    (email && await findGuestByAnyId(hotelId, email)) ||
    (waId && await findGuestByAnyId(hotelId, waId)) ||
    (phone && await findGuestByAnyId(hotelId, phone));

  if (found) {
    await upsertAliasesAndIdentifiers(hotelId, found, {
      aliases: unique([rawId, email, waId, phone, doc, web_id].filter(Boolean) as string[]),
      email,
      whatsappId: waId,
      phoneE164: phone,
      doc,
      web_id,
      source: ids.source,  // ✅ ahora existe
    });

    // refrescar doc
    const refreshed = await getGuestsCollection().findOne({ hotelId, guestId: found.guestId });
    return refreshed ?? found;
  }

  // 2) Crear nuevo canónico
  const now = new Date().toISOString();
  const guestId = pickCanonicalId({ rawId, email, whatsappId: waId, phoneE164: phone });
const aliases = unique([rawId, email, waId, phone, doc, web_id].filter(Boolean) as string[])
  .filter((a) => a !== guestId);

const newGuest: Guest = {
  guestId,
  hotelId,
  name: defaults?.name ?? "",
  email: email ?? defaults?.email,
  phone: phone ?? defaults?.phone,
  channel: defaults?.channel,
  reservationIds: defaults?.reservationIds ?? [],
  createdAt: now,
  updatedAt: now,
  mode: defaults?.mode ?? "automatic",
  tags: defaults?.tags ?? [],
  mergedIds: defaults?.mergedIds ?? [],
  nationality: defaults?.nationality,
  language: defaults?.language,
  checkInDates: defaults?.checkInDates,
  checkOutDates: defaults?.checkOutDates,
  birthdate: defaults?.birthdate,
  loyaltyId: defaults?.loyaltyId,
  vipLevel: defaults?.vipLevel,
  aliases: aliases.length ? aliases : undefined,
  identifiers: {
    email,
    whatsappId: waId,
    phoneE164: phone,
    doc,
    web_id,
  },
  identifiersHistory: buildHistoryAdds(
    { email, whatsappId: waId, phoneE164: phone, doc, web_id },
    ids.source
  ),
};


  await createGuest(newGuest);
  return newGuest;
}
