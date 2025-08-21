// /root/begasist/scripts/guests-maintenance.ts

/* eslint-disable no-console */

// Run:
// pnpm exec tsx scripts/guests-maintenance.ts            # dry-run
// pnpm exec tsx scripts/guests-maintenance.ts --apply    # aplica cambios

import { getAstraDB } from "../lib/astra/connection";
import type { Guest } from "../types/channel";

const APPLY = process.argv.includes("--apply");
const nowIso = () => new Date().toISOString();

/** Tipado mínimo de colección para evitar problemas con tipos del SDK */
type Col<T> = {
  findOne: (filter: any) => Promise<T | null>;
  insertOne: (doc: T) => Promise<any>;
  updateOne: (filter: any, update: any, options?: any) => Promise<any>;
  updateMany: (filter: any, update: any, options?: any) => Promise<any>;
  deleteOne: (filter: any) => Promise<any>;
};

function unique<T>(arr: (T | undefined | null)[]): T[] {
  return Array.from(new Set(arr.filter(Boolean) as T[]));
}

async function getCollections() {
  const db = getAstraDB();
  const guests = db.collection("guests") as unknown as Col<Guest>;
  const conversations = db.collection("conversations") as unknown as Col<any>;
  const messages = db.collection("messages") as unknown as Col<any>;
  return { guests, conversations, messages };
}

/** Borra un guest exacto */
async function deleteGuestExact(guests: Col<Guest>, hotelId: string, guestId: string) {
  const doc = await guests.findOne({ hotelId, guestId });
  if (!doc) {
    console.log(`ℹ️ delete: no existe {hotelId:${hotelId}, guestId:${guestId}}`);
    return;
  }
  console.log(`🗑️ delete: guests {hotelId:${hotelId}, guestId:${guestId}}`);
  if (APPLY) {
    await guests.deleteOne({ hotelId, guestId });
  }
}

/** Une arrays string sin duplicados */
function mergeStrArrays(a?: string[], b?: string[]) {
  return unique([...(a ?? []), ...(b ?? [])]);
}

/** Selecciona el nombre “mejor” (preferimos el más largo no vacío) */
function pickBestName(a?: string, b?: string) {
  const A = (a ?? "").trim();
  const B = (b ?? "").trim();
  if (A && B) return A.length >= B.length ? A : B;
  return A || B || "";
}

/** Preferimos supervised si alguno lo es */
function pickMode(a?: Guest["mode"], b?: Guest["mode"]): Guest["mode"] {
  if (a === "supervised" || b === "supervised") return "supervised";
  return a || b || "automatic";
}

/** ¿Parece email? */
function looksLikeEmail(id: string | undefined) {
  return !!id && id.includes("@") && !id.endsWith("@c.us");
}

/** Decide canónico: si el primaryId es email, usamos ese; si no, si el secondary es email, usamos ese; si no, primary */
function chooseCanonicalId(primaryId: string, secondaryId: string) {
  if (looksLikeEmail(primaryId)) return primaryId;
  if (looksLikeEmail(secondaryId)) return secondaryId;
  return primaryId;
}

/** Actualiza cascada en conversations/messages: guestId viejo -> nuevo */
async function cascadeGuestId(
  conversations: Col<any>,
  messages: Col<any>,
  hotelId: string,
  oldGuestId: string,
  newGuestId: string
) {
  const convRes = await conversations.updateMany(
    { hotelId, guestId: oldGuestId },
    { $set: { guestId: newGuestId } }
  );
  const msgRes = await messages.updateMany(
    { hotelId, guestId: oldGuestId },
    { $set: { guestId: newGuestId } }
  );
  console.log(
    `🔁 cascade: conversations(..) messages(..) old=${oldGuestId} -> new=${newGuestId}`
  );
}

/** Fusiona dos guests del MISMO hotel */
async function mergeGuests(
  guests: Col<Guest>,
  conversations: Col<any>,
  messages: Col<any>,
  hotelId: string,
  primaryId: string,
  secondaryId: string
) {
  const primary = await guests.findOne({ hotelId, guestId: primaryId });
  const secondary = await guests.findOne({ hotelId, guestId: secondaryId });

  if (!primary && !secondary) {
    console.log(`⚠️ merge: no existen ninguno de los dos en hotelId=${hotelId}`);
    return;
  }
  if (!primary || !secondary) {
    console.log(`ℹ️ merge: solo existe uno. Manteniendo el existente en hotelId=${hotelId}.`);
    return;
  }

  const targetId = chooseCanonicalId(primary.guestId, secondary.guestId);

  const merged: Guest = {
    guestId: targetId,
    hotelId,
    name: pickBestName(primary.name, secondary.name),
    firstName: pickBestName(primary.firstName, secondary.firstName),
    lastName: pickBestName(primary.lastName, secondary.lastName),
    email: primary.email || secondary.email,
    phone: primary.phone || secondary.phone,
    channel: primary.channel || secondary.channel,
    reservationIds: mergeStrArrays(primary.reservationIds, secondary.reservationIds),
    createdAt: (primary.createdAt && secondary.createdAt)
      ? (primary.createdAt < secondary.createdAt ? primary.createdAt : secondary.createdAt)
      : (primary.createdAt || secondary.createdAt || nowIso()),
    updatedAt: nowIso(),
    mode: pickMode(primary.mode, secondary.mode),
    tags: mergeStrArrays(primary.tags, secondary.tags),
    mergedIds: mergeStrArrays(mergeStrArrays(primary.mergedIds, secondary.mergedIds), [secondary.guestId, primary.guestId]),
    nationality: primary.nationality || secondary.nationality,
    language: primary.language || secondary.language,
    checkInDates: mergeStrArrays(primary.checkInDates, secondary.checkInDates),
    checkOutDates: mergeStrArrays(primary.checkOutDates, secondary.checkOutDates),
    birthdate: primary.birthdate || secondary.birthdate,
    loyaltyId: primary.loyaltyId || secondary.loyaltyId,
    vipLevel: primary.vipLevel || secondary.vipLevel,
  };

  console.log("🔗 merge plan:", {
    hotelId,
    keepAs: targetId,
    delete: targetId === secondary.guestId ? primary.guestId : secondary.guestId,
    name: merged.name,
    mode: merged.mode,
    reservations: merged.reservationIds?.length ?? 0,
  });

  if (!APPLY) return;

  // 1) Upsert canónico
  await guests.updateOne(
    { hotelId, guestId: targetId },
    { $set: merged },
    { upsert: true }
  );

  // 2) Borrar el otro doc y cascadear IDs en conversaciones/mensajes
  const toDelete = (targetId === secondary.guestId) ? primary.guestId : secondary.guestId;
  if (toDelete !== targetId) {
    await cascadeGuestId(conversations, messages, hotelId, toDelete, targetId);
    await guests.deleteOne({ hotelId, guestId: toDelete });
    console.log(`✅ merged: ${toDelete} ➜ ${targetId}`);
  }
}

/** Añade tag “needs_identity_link” (y flag liviana) */
async function markNormalizationCandidate(guests: Col<Guest>, hotelId: string, guestId: string) {
  const g = await guests.findOne({ hotelId, guestId });
  if (!g) {
    console.log(`ℹ️ mark: no existe {hotelId:${hotelId}, guestId:${guestId}}`);
    return;
  }
  const nextTags = unique([...(g.tags ?? []), "needs_identity_link"]);
  console.log(`🏷️ mark: ${guestId} (+needs_identity_link)`);
  if (APPLY) {
    await guests.updateOne(
      { hotelId, guestId },
      { $set: { tags: nextTags, updatedAt: nowIso(), normalizationCandidate: true } }
    );
  }
}

async function main() {
  const { guests, conversations, messages } = await getCollections();

  console.log(APPLY ? "🚀 RUN MODE: APPLY" : "🔎 RUN MODE: DRY-RUN");

  // 1) Eliminar huérfano exacto (hotelId == guestId)
  await deleteGuestExact(guests, "guest-789", "guest-789");

  // 2) Fusionar Marcelo en hotel999 (canónico = email)
  const emailId = "marcelomst1@gmail.com";
  const waId = "59891359375@c.us";
  await mergeGuests(guests, conversations, messages, "hotel999", emailId, waId);

  // 3) Marcar “candidatos a normalizar” (Azucitrus, Ciemsa)
  await markNormalizationCandidate(guests, "hotel999", "b1872a3b-5eb0-4bbb-8940-836a6efb19f4"); // Azucitrus
  await markNormalizationCandidate(guests, "hotel999", "e9802d07-204b-4e25-99a4-790ffbcc8409"); // Ciemsa

  console.log("✅ done.");
}

main().catch((err) => {
  console.error("💥 ERROR:", err);
  process.exit(1);
});
