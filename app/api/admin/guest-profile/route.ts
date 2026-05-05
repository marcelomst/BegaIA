import { NextRequest, NextResponse } from "next/server";
import { findBestGuestByGuestId } from "@/lib/db/guests";
import { getGuestAliasesByGuestId } from "@/lib/db/guestAliases";
import { getConversationsForGuestPerspective } from "@/lib/db/conversations";
import { deriveGuestReadAliases } from "@/lib/utils/guestReadAliases";
import type { Guest } from "@/types/channel";

type GuestProfileResponse = {
  guestId: string;
  guest: Guest | null;
  aliases: string[];
  channels: string[];
  conversationCount: number;
  lastActivityAt: string | null;
};

function normalizeText(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function channelFromAlias(alias: string): string | null {
  const idx = alias.indexOf(":");
  if (idx <= 0) return null;
  const prefix = alias.slice(0, idx).trim().toLowerCase();
  if (prefix === "whatsapp" || prefix === "email" || prefix === "web") return prefix;
  return null;
}

function toIsoOrNull(value: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  return new Date(time).toISOString();
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hotelId = normalizeText(url.searchParams.get("hotelId")) || "hotel999";
    const guestId = normalizeText(url.searchParams.get("guestId"));
    if (!guestId) {
      return NextResponse.json({ error: "guestId required" }, { status: 400 });
    }

    const [guest, aliasRecords] = await Promise.all([
      findBestGuestByGuestId(hotelId, guestId),
      getGuestAliasesByGuestId({ hotelId, guestId }).catch((error) => {
        console.warn("[admin/guest-profile] guest aliases reverse lookup unavailable; using guest document fallback", {
          hotelId,
          guestId,
          error: error instanceof Error ? error.message : String(error),
        });
        return [];
      }),
    ]);

    const aliases = deriveGuestReadAliases(
      guest,
      aliasRecords.map((a) => normalizeText(a.alias)).filter(Boolean),
    );
    const conversations = await getConversationsForGuestPerspective({
      hotelId,
      guestId,
      aliases,
    });

    const channels = new Set<string>();
    aliases.forEach((alias) => {
      const ch = channelFromAlias(alias);
      if (ch) channels.add(ch);
    });
    conversations.forEach((conv) => {
      const ch = normalizeText(conv.channel);
      if (ch) channels.add(ch);
    });

    let lastActivityAt: string | null = null;
    for (const conv of conversations) {
      const iso = toIsoOrNull(normalizeText(conv.lastUpdatedAt));
      if (!iso) continue;
      if (!lastActivityAt || Date.parse(iso) > Date.parse(lastActivityAt)) {
        lastActivityAt = iso;
      }
    }

    const response: GuestProfileResponse = {
      guestId,
      guest: guest ?? null,
      aliases,
      channels: Array.from(channels),
      conversationCount: conversations.length,
      lastActivityAt,
    };

    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
