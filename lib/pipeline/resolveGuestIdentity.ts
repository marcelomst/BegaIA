// Path: /root/begasist/lib/pipeline/resolveGuestIdentity.ts

import type { Channel } from "@/types/channel";
import { ensureGuestAlias, getGuestIdByAlias } from "@/lib/db/guestAliases";
import { getGuest } from "@/lib/db/guests";

export type ResolveGuestIdentityInput = {
  hotelId?: string;
  channel: Channel;
  rawGuestId?: string;
};

export type ResolveGuestIdentityOutput = {
  guestId?: string;
  guestAlias?: string;
};

function normalizeRawGuestId(rawGuestId?: string): string {
  return String(rawGuestId ?? "").trim();
}

function buildGuestAlias(channel: Channel, rawGuestId?: string): string {
  const raw = normalizeRawGuestId(rawGuestId);
  if (!raw) return "";

  if (channel === "whatsapp") {
    let stripped = raw;

    // Guard against duplicated transport prefixes (e.g. "whatsapp:whatsapp:+598...")
    while (stripped.startsWith("whatsapp:")) {
      stripped = stripped.slice("whatsapp:".length).trim();
    }

    return `whatsapp:${stripped}`;
  }
  if (channel === "web") {
    return `web:${raw}`;
  }
  if (channel === "email") {
    return `email:${raw.toLowerCase()}`;
  }
  return `${channel}:${raw}`;
}

async function backfillAliasToLegacyGuest(params: {
  hotelId: string;
  alias: string;
  legacyGuestId: string;
}): Promise<void> {
  try {
    await ensureGuestAlias({
      hotelId: params.hotelId,
      alias: params.alias,
      preferredGuestId: params.legacyGuestId,
    });
  } catch {
    // Idempotencia simple ante carreras de escritura.
  }
}

export async function resolveGuestIdentity(
  input: ResolveGuestIdentityInput,
): Promise<ResolveGuestIdentityOutput> {
  const hotelId = String(input.hotelId ?? "").trim();
  const alias = buildGuestAlias(input.channel, input.rawGuestId);
  if (!hotelId || !alias) return {};

  const mappedGuestId = await getGuestIdByAlias({ hotelId, alias });
  if (mappedGuestId) {
    return {
      guestId: mappedGuestId,
      guestAlias: alias,
    };
  }

  const legacyGuest = await getGuest(hotelId, alias);
  if (legacyGuest?.guestId) {
    await backfillAliasToLegacyGuest({
      hotelId,
      alias,
      legacyGuestId: legacyGuest.guestId,
    });
    return {
      guestId: legacyGuest.guestId,
      guestAlias: alias,
    };
  }

  const resolved = await ensureGuestAlias({
    hotelId,
    alias,
  });

  return {
    guestId: resolved.guestId,
    guestAlias: alias,
  };
}
