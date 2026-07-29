// Path: /root/begasist/lib/db/guestMerge.ts

import { getAstraDB } from "@/lib/astra/connection";
import { createGuest, getGuest, updateGuest } from "@/lib/db/guests";
import {
  getGuestAliasesByGuestId,
  reassignGuestAliasForMerge,
} from "@/lib/db/guestAliases";
import type { Guest } from "@/types/channel";

type MergeGuestsInput = {
  hotelId: string;
  primaryGuestId: string;
  secondaryGuestId: string;
  mergedBy?: string;
};

type MergeGuestsResult = {
  primaryGuestId: string;
  secondaryGuestId: string;
  movedAliases: number;
  updatedConversations: number;
  updatedMessages: number;
};

const CONVERSATIONS_COLLECTION = "conversations";
const MESSAGES_COLLECTION = "messages";

function normalizeText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function aliasCandidatesFromGuestId(guestId: string): string[] {
  const normalized = normalizeText(guestId);
  if (!normalized) return [];
  if (normalized.includes(":")) return [normalized];
  if (normalized.includes("@")) return [normalized.toLowerCase(), `email:${normalized.toLowerCase()}`];
  return [];
}

function matchedCountOf(result: unknown): number {
  const value = (result as { matchedCount?: unknown } | null)?.matchedCount;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isMergedGuest(guest: Guest | null): boolean {
  if (!guest) return false;
  const tags = Array.isArray(guest.tags) ? guest.tags : [];
  return tags.some((t) => {
    const v = String(t);
    return v === "merged" || v.startsWith("merged-into:");
  });
}

async function ensureGuestExists(input: {
  hotelId: string;
  guestId: string;
  existing: Guest | null;
}): Promise<Guest> {
  if (input.existing) return input.existing;

  const now = new Date().toISOString();
  const aliases = aliasCandidatesFromGuestId(input.guestId).filter((alias) => alias !== input.guestId);
  const guest: Guest = {
    hotelId: input.hotelId,
    guestId: input.guestId,
    createdAt: now,
    updatedAt: now,
    mode: "supervised",
    aliases,
  };
  await createGuest(guest);
  return guest;
}

async function safeGetAliasesByGuestId(input: {
  hotelId: string;
  guestId: string;
}): Promise<string[]> {
  try {
    const rows = await getGuestAliasesByGuestId(input);
    return rows.map((a) => normalizeText(a.alias)).filter(Boolean);
  } catch {
    return [];
  }
}

export async function mergeGuestsManual(input: MergeGuestsInput): Promise<MergeGuestsResult> {
  const hotelId = normalizeText(input.hotelId);
  const primaryGuestId = normalizeText(input.primaryGuestId);
  const secondaryGuestId = normalizeText(input.secondaryGuestId);
  const mergedBy = normalizeText(input.mergedBy) || "admin";

  if (!hotelId) throw new Error("hotelId required");
  if (!primaryGuestId || !secondaryGuestId) throw new Error("primaryGuestId and secondaryGuestId are required");
  if (primaryGuestId === secondaryGuestId) throw new Error("primaryGuestId and secondaryGuestId must be different");

  const primaryRawPromise = getGuest(hotelId, primaryGuestId);
  const secondaryRawPromise = getGuest(hotelId, secondaryGuestId);
  const secondaryAliasesFromTablePromise = safeGetAliasesByGuestId({ hotelId, guestId: secondaryGuestId });
  const [primaryRaw, secondaryRaw, secondaryAliasesFromTable] = await Promise.all([
    primaryRawPromise,
    secondaryRawPromise,
    secondaryAliasesFromTablePromise,
  ]);

  const [primary, secondary] = await Promise.all([
    ensureGuestExists({ hotelId, guestId: primaryGuestId, existing: primaryRaw }),
    ensureGuestExists({ hotelId, guestId: secondaryGuestId, existing: secondaryRaw }),
  ]);

  if (isMergedGuest(secondary)) throw new Error("secondary guest is already merged");

  const primaryAliasSet = new Set([
    ...(Array.isArray(primary.aliases) ? primary.aliases.map((a) => normalizeText(a)).filter(Boolean) : []),
    ...aliasCandidatesFromGuestId(primaryGuestId),
  ]);
  const secondaryAliases = unique([
    ...secondaryAliasesFromTable,
    ...(Array.isArray(secondary.aliases) ? secondary.aliases.map((a) => normalizeText(a)).filter(Boolean) : []),
    ...aliasCandidatesFromGuestId(secondaryGuestId),
  ]);

  const movedAliasCount = secondaryAliases.filter((alias) => !primaryAliasSet.has(alias)).length;
  await Promise.all(
    secondaryAliases.map((alias) =>
      reassignGuestAliasForMerge({
        hotelId,
        alias,
        primaryGuestId,
      }),
    ),
  );
  for (const alias of secondaryAliases) {
    primaryAliasSet.add(alias);
  }

  const db = getAstraDB();
  const convCol = db.collection<any>(CONVERSATIONS_COLLECTION);
  const msgCol = db.collection<any>(MESSAGES_COLLECTION);
  const mergedAt = new Date().toISOString();

  const conversationsUpdate = await convCol.updateMany(
    { hotelId, guestId: secondaryGuestId },
    {
      $set: {
        guestId: primaryGuestId,
        lastUpdatedAt: mergedAt,
        "metadata.guestMerge": {
          mergedAt,
          mergedBy,
          fromGuestId: secondaryGuestId,
          toGuestId: primaryGuestId,
        },
      },
    },
  );

  const messagesUpdate = await msgCol.updateMany(
    { hotelId, guestId: secondaryGuestId },
    { $set: { guestId: primaryGuestId, updatedAt: mergedAt } },
  );

  const mergedIds = unique([
    ...(Array.isArray(primary.mergedIds) ? primary.mergedIds : []),
    secondaryGuestId,
    ...(Array.isArray(secondary.mergedIds) ? secondary.mergedIds : []),
  ]);
  const mergedAliases = unique([
    ...(Array.isArray(primary.aliases) ? primary.aliases : []),
    ...(Array.isArray(secondary.aliases) ? secondary.aliases : []),
    ...Array.from(primaryAliasSet),
  ]);

  await updateGuest(hotelId, primaryGuestId, {
    aliases: mergedAliases,
    mergedIds,
    updatedAt: new Date().toISOString(),
  });

  const secondaryTags = unique([
    ...(Array.isArray(secondary.tags) ? secondary.tags : []),
    "merged",
    `merged-into:${primaryGuestId}`,
  ]);
  await updateGuest(hotelId, secondaryGuestId, {
    tags: secondaryTags,
    updatedAt: new Date().toISOString(),
  });

  return {
    primaryGuestId,
    secondaryGuestId,
    movedAliases: movedAliasCount,
    updatedConversations: matchedCountOf(conversationsUpdate),
    updatedMessages: matchedCountOf(messagesUpdate),
  };
}
