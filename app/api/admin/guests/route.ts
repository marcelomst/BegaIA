// Path: /root/begasist/app/api/admin/guests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { findGuestsByHotel } from "@/lib/db/guests";
import {
  filterConversationsForGuestPerspective,
  getAllConversationsForHotel,
} from "@/lib/db/conversations";
import { deriveGuestReadAliases } from "@/lib/utils/guestReadAliases";
import type { Guest } from "@/types/channel";

type GuestListItem = {
  guestId: string;
  name: string | null;
  mode: string | null;
  aliases: string[];
  channels: string[];
  conversationCount: number;
  lastActivityAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  absorbed: boolean;
};

type GuestLikeRow = Guest & {
  aliases?: string[];
};

function normalizeText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function channelFromAlias(alias: string): string | null {
  const idx = alias.indexOf(":");
  if (idx <= 0) return null;
  const prefix = alias.slice(0, idx).trim().toLowerCase();
  if (!prefix) return null;
  return prefix;
}

function isAbsorbedGuest(g: Guest): boolean {
  const tags = Array.isArray(g.tags) ? g.tags : [];
  return tags.some((t) => {
    const v = String(t);
    return v === "merged" || v.startsWith("merged-into:");
  });
}

function buildGuestRowsFromConversations(hotelId: string, conversations: Array<Record<string, unknown>>): GuestLikeRow[] {
  const byGuestId = new Map<string, GuestLikeRow>();

  for (const conversation of conversations) {
    const guestId = normalizeText(conversation.guestId);
    if (!guestId) continue;

    const existing = byGuestId.get(guestId);
    const channel = normalizeText(conversation.channel) || undefined;
    const lastUpdatedAt =
      normalizeText(conversation.lastUpdatedAt) ||
      normalizeText(conversation.startedAt) ||
      new Date(0).toISOString();

    if (!existing) {
      const alias = guestId.includes(":") ? guestId : "";
      byGuestId.set(guestId, {
        guestId,
        hotelId,
        name: null as any,
        mode: undefined,
        createdAt: lastUpdatedAt,
        updatedAt: lastUpdatedAt,
        channel: channel as any,
        aliases: alias ? [alias] : [],
      });
      continue;
    }

    const existingUpdated = Date.parse(normalizeText(existing.updatedAt) || new Date(0).toISOString());
    const candidateUpdated = Date.parse(lastUpdatedAt);
    if (Number.isFinite(candidateUpdated) && candidateUpdated > existingUpdated) {
      existing.updatedAt = lastUpdatedAt;
      if (!existing.createdAt) existing.createdAt = lastUpdatedAt;
    }
    if (!existing.channel && channel) existing.channel = channel as any;
    if (guestId.includes(":")) {
      const aliases = new Set(Array.isArray(existing.aliases) ? existing.aliases : []);
      aliases.add(guestId);
      existing.aliases = Array.from(aliases);
    }
  }

  return Array.from(byGuestId.values());
}

const GUESTS_LIST_TIMEOUT_MS = 3000;
const GUEST_CONVERSATIONS_TIMEOUT_MS = 2500;

function elapsedMs(startMs: number): number {
  return Date.now() - startMs;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function safeFindGuestsByHotel(hotelId: string) {
  try {
    return await withTimeout(findGuestsByHotel(hotelId), GUESTS_LIST_TIMEOUT_MS, "guests_list");
  } catch (error) {
    console.warn("[admin/guests] findGuestsByHotel failed; falling back to empty list", {
      hotelId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

async function safeGetAllConversationsForHotel(hotelId: string) {
  try {
    return await withTimeout(
      getAllConversationsForHotel(hotelId),
      GUEST_CONVERSATIONS_TIMEOUT_MS,
      "admin_guest_conversations",
    );
  } catch (error) {
    console.warn("[admin/guests] getAllConversationsForHotel failed; using minimal guest rows", {
      hotelId,
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function GET(req: NextRequest) {
  const startedAtMs = Date.now();
  try {
    const url = new URL(req.url);
    const hotelId = normalizeText(url.searchParams.get("hotelId")) || "hotel999";
    const includeAbsorbed = normalizeText(url.searchParams.get("includeAbsorbed")) === "1";
    console.info("[admin/guests] request_started", { hotelId, includeAbsorbed });

    let guests = await safeFindGuestsByHotel(hotelId);
    console.info("[admin/guests] guests_loaded", {
      hotelId,
      guestCount: guests.length,
      elapsedMs: elapsedMs(startedAtMs),
    });

    const conversations = await safeGetAllConversationsForHotel(hotelId);
    console.info("[admin/guests] conversations_loaded", {
      hotelId,
      totalConversations: conversations.length,
      elapsedMs: elapsedMs(startedAtMs),
    });

    if (guests.length === 0 && conversations.length > 0) {
      guests = buildGuestRowsFromConversations(hotelId, conversations as Array<Record<string, unknown>>);
      console.warn("[admin/guests] guests collection empty; using conversation-derived fallback rows", {
        hotelId,
        derivedGuestCount: guests.length,
        totalConversations: conversations.length,
        elapsedMs: elapsedMs(startedAtMs),
      });
    }

    const items: GuestListItem[] = [];
    let associatedConversationCount = 0;
    let guestsWithConversations = 0;
    for (const guest of guests) {
      const guestId = normalizeText(guest.guestId);
      if (!guestId) continue;

      const absorbed = isAbsorbedGuest(guest);
      if (!includeAbsorbed && absorbed) continue;

      const aliases = deriveGuestReadAliases(guest);

      const guestConvs = filterConversationsForGuestPerspective(conversations, {
        guestId,
        aliases,
      });
      associatedConversationCount += guestConvs.length;
      if (guestConvs.length > 0) guestsWithConversations += 1;
      const channels = new Set<string>();
      aliases.forEach((a) => {
        const ch = channelFromAlias(a);
        if (ch) channels.add(ch);
      });
      guestConvs.forEach((c) => {
        const ch = normalizeText(c.channel);
        if (ch) channels.add(ch);
      });

      let lastActivityAt: string | null = null;
      guestConvs.forEach((c) => {
        const ts = normalizeText(c.lastUpdatedAt);
        if (!ts) return;
        if (!lastActivityAt || Date.parse(ts) > Date.parse(lastActivityAt)) {
          lastActivityAt = ts;
        }
      });

      items.push({
        guestId,
        name: normalizeText(guest.name) || null,
        mode: normalizeText(guest.mode) || null,
        aliases,
        channels: Array.from(channels),
        conversationCount: guestConvs.length,
        lastActivityAt,
        createdAt: normalizeText(guest.createdAt) || null,
        updatedAt: normalizeText(guest.updatedAt) || null,
        absorbed,
      });
    }

    console.info("[admin/guests] guest_metrics_resolved", {
      hotelId,
      guestCount: guests.length,
      totalConversations: conversations.length,
      guestsWithConversations,
      associatedConversationCount,
      elapsedMs: elapsedMs(startedAtMs),
    });

    items.sort((a, b) => {
      const ta = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const tb = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return tb - ta;
    });

    console.info("[admin/guests] response_sent", {
      hotelId,
      rowCount: items.length,
      elapsedMs: elapsedMs(startedAtMs),
    });
    return NextResponse.json({ hotelId, guests: items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
