// Path: /root/begasist/lib/db/guestAliases.ts

import { v4 as uuidv4 } from "uuid";
import { getCassandraClient } from "@/lib/astra/connection";
import { createGuest } from "@/lib/db/guests";
import type { Guest } from "@/types/channel";

export type GuestAliasRecord = {
  hotelId: string;
  alias: string;
  guestId: string;
  createdAt: string;
};

const GUEST_ALIASES_TABLE = "guest_aliases";

function tableRef(): string {
  // The CQL client is already scoped to the configured keyspace.
  return GUEST_ALIASES_TABLE;
}

async function findGuestAlias(input: {
  hotelId: string;
  alias: string;
}): Promise<GuestAliasRecord | null> {
  const client = getCassandraClient();
  const query = `SELECT hotelid, alias, guestid, createdat FROM ${tableRef()} WHERE hotelid = ? AND alias = ? LIMIT 1`;
  const result = await client.execute(query, [input.hotelId, input.alias], { prepare: true });
  const row = result.first();
  if (!row) return null;

  const createdAtRaw = row.get("createdat") as Date | string | null;
  const createdAt =
    createdAtRaw instanceof Date
      ? createdAtRaw.toISOString()
      : typeof createdAtRaw === "string"
        ? createdAtRaw
        : new Date().toISOString();

  return {
    hotelId: String(row.get("hotelid") ?? ""),
    alias: String(row.get("alias") ?? ""),
    guestId: String(row.get("guestid") ?? ""),
    createdAt,
  };
}

async function insertGuestAlias(input: {
  hotelId: string;
  alias: string;
  guestId: string;
  createdAt: Date;
}): Promise<void> {
  const client = getCassandraClient();
  const query = `INSERT INTO ${tableRef()} (hotelid, alias, guestid, createdat) VALUES (?, ?, ?, ?)`;
  await client.execute(query, [input.hotelId, input.alias, input.guestId, input.createdAt], { prepare: true });
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

  const doc = await findGuestAlias({ hotelId, alias });
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

  const existing = await findGuestAlias({ hotelId, alias });
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
    await insertGuestAlias({
      hotelId,
      alias,
      guestId,
      createdAt: new Date(),
    });
    return { guestId, created: true };
  } catch {
    const raced = await findGuestAlias({ hotelId, alias });
    if (raced?.guestId) {
      return { guestId: raced.guestId, created: false };
    }
    throw new Error("ensureGuestAlias failed");
  }
}
