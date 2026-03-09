// Path: /root/begasist/app/api/admin/guests/route.ts

import { NextRequest, NextResponse } from "next/server";
import { findGuestsByHotel } from "@/lib/db/guests";
import { getGuestAliasesByGuestId } from "@/lib/db/guestAliases";
import { getAllConversationsForHotel } from "@/lib/db/conversations";
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

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hotelId = normalizeText(url.searchParams.get("hotelId")) || "hotel999";
    const includeAbsorbed = normalizeText(url.searchParams.get("includeAbsorbed")) === "1";

    const [guests, conversations] = await Promise.all([
      findGuestsByHotel(hotelId),
      getAllConversationsForHotel(hotelId),
    ]);

    const convByGuest = new Map<string, any[]>();
    for (const conv of conversations) {
      const gid = normalizeText(conv.guestId);
      if (!gid) continue;
      const current = convByGuest.get(gid) ?? [];
      current.push(conv);
      convByGuest.set(gid, current);
    }

    const items: GuestListItem[] = [];
    for (const guest of guests) {
      const absorbed = isAbsorbedGuest(guest);
      if (!includeAbsorbed && absorbed) continue;

      const aliasRows = await getGuestAliasesByGuestId({
        hotelId,
        guestId: guest.guestId,
      });
      const aliasesFromTable = aliasRows
        .map((a) => normalizeText(a.alias))
        .filter(Boolean);
      const aliases = Array.from(
        new Set([
          ...aliasesFromTable,
          ...(Array.isArray(guest.aliases) ? guest.aliases.map((a) => normalizeText(a)).filter(Boolean) : []),
        ]),
      );

      const guestConvs = convByGuest.get(guest.guestId) ?? [];
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
        guestId: guest.guestId,
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

    items.sort((a, b) => {
      const ta = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const tb = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return tb - ta;
    });

    return NextResponse.json({ hotelId, guests: items });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
