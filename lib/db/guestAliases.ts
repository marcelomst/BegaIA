// Path: /root/begasist/lib/db/guestAliases.ts

import { v4 as uuidv4 } from "uuid";
import { getAstraDB } from "@/lib/astra/connection";
import { createGuest } from "@/lib/db/guests";
import type { Guest } from "@/types/channel";

export type GuestAliasRecord = {
  hotelId: string;
  alias: string;
  guestId: string;
  createdAt: string;
};

function getGuestAliasesCollection() {
  return getAstraDB().collection<GuestAliasRecord>("guest_aliases");
}

export function normalizeGuestAlias(raw: string): string {
  const v = String(raw ?? "").trim();
  if (!v) return "";
  return v.toLowerCase().startsWith("email:") ? v.toLowerCase() : v;
}

export async function getGuestIdByAlias(input: {
  hotelId: string;
  alias: string;
}): Promise<string | null> {
  const hotelId = String(input.hotelId ?? "").trim();
  const alias = normalizeGuestAlias(input.alias);
  if (!hotelId || !alias) return null;

  const doc = await getGuestAliasesCollection().findOne({ hotelId, alias });
  return typeof doc?.guestId === "string" && doc.guestId.trim() ? doc.guestId : null;
}

export async function ensureGuestAlias(input: {
  hotelId: string;
  alias: string;
  preferredGuestId?: string;
}): Promise<{ guestId: string; created: boolean }> {
  const hotelId = String(input.hotelId ?? "").trim();
  const alias = normalizeGuestAlias(input.alias);
  if (!hotelId) throw new Error("hotelId required");
  if (!alias) throw new Error("alias required");

  const collection = getGuestAliasesCollection();

  const existing = await collection.findOne({ hotelId, alias });
  if (existing?.guestId) {
    return { guestId: existing.guestId, created: false };
  }

  let guestId = String(input.preferredGuestId ?? "").trim();

  if (!guestId) {
    guestId = uuidv4();
    const now = new Date().toISOString();
    const newGuest: Guest = {
      hotelId,
      guestId,
      createdAt: now,
      updatedAt: now,
      mode: "automatic",
    };
    await createGuest(newGuest);
  }

  try {
    await collection.insertOne({
      hotelId,
      alias,
      guestId,
      createdAt: new Date().toISOString(),
    });
    return { guestId, created: true };
  } catch {
    const raced = await collection.findOne({ hotelId, alias });
    if (raced?.guestId) {
      return { guestId: raced.guestId, created: false };
    }
    throw new Error("ensureGuestAlias failed");
  }
}
