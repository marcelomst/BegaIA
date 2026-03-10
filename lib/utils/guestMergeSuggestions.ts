// Path: /root/begasist/lib/utils/guestMergeSuggestions.ts

type GuestSuggestionInput = {
  guestId: string;
  name: string | null;
  aliases: string[];
  channels: string[];
  conversationCount: number;
  lastActivityAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  absorbed: boolean;
};

export type GuestMergeSuggestion = {
  key: string;
  primaryGuestId: string;
  secondaryGuestId: string;
  score: number;
  severity: "high" | "medium" | "low";
  signals: string[];
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeName(value: string | null | undefined): string {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function activityTimestamp(guest: GuestSuggestionInput): number {
  const candidate = guest.lastActivityAt || guest.updatedAt || guest.createdAt;
  const ts = Date.parse(String(candidate || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function aliasValues(guest: GuestSuggestionInput): Array<{ kind: string; value: string }> {
  return guest.aliases
    .map((alias) => {
      const idx = alias.indexOf(":");
      if (idx <= 0) return null;
      const kind = alias.slice(0, idx).trim().toLowerCase();
      const value = alias.slice(idx + 1).trim().toLowerCase();
      if (!kind || !value) return null;
      return { kind, value };
    })
    .filter((item): item is { kind: string; value: string } => Boolean(item));
}

function buildSignals(a: GuestSuggestionInput, b: GuestSuggestionInput): { score: number; signals: string[] } {
  let score = 0;
  const signals: string[] = [];

  const aTs = activityTimestamp(a);
  const bTs = activityTimestamp(b);
  const diffMs = aTs && bTs ? Math.abs(aTs - bTs) : Number.POSITIVE_INFINITY;
  const hour = 60 * 60 * 1000;

  if (diffMs <= 15 * 60 * 1000) {
    score += 3;
    signals.push("actividad muy cercana");
  } else if (diffMs <= 2 * hour) {
    score += 2;
    signals.push("actividad cercana");
  } else if (diffMs <= 24 * hour) {
    score += 1;
    signals.push("actividad del mismo día");
  }

  const aChannels = new Set(a.channels.map((v) => normalizeText(v).toLowerCase()).filter(Boolean));
  const bChannels = new Set(b.channels.map((v) => normalizeText(v).toLowerCase()).filter(Boolean));
  const distinctChannels = [...aChannels].some((ch) => !bChannels.has(ch)) || [...bChannels].some((ch) => !aChannels.has(ch));
  if (distinctChannels && aChannels.size > 0 && bChannels.size > 0) {
    score += 1;
    signals.push("canales distintos");
  }

  const aName = normalizeName(a.name);
  const bName = normalizeName(b.name);
  if (aName && bName && aName === bName) {
    score += 4;
    signals.push("nombre igual");
  }

  if ((aName && !bName) || (!aName && bName)) {
    if (diffMs <= 24 * hour) {
      score += 2;
      signals.push("uno sin nombre");
    } else {
      score += 1;
      signals.push("uno sin nombre");
    }
  }

  const aAliasValues = aliasValues(a);
  const bAliasValues = aliasValues(b);
  const aWeb = aAliasValues.some((item) => item.kind === "web");
  const bWeb = bAliasValues.some((item) => item.kind === "web");
  const aNonWeb = aAliasValues.some((item) => item.kind !== "web");
  const bNonWeb = bAliasValues.some((item) => item.kind !== "web");
  if ((aWeb && bNonWeb) || (bWeb && aNonWeb)) {
    score += 1;
    signals.push("aliases complementarios");
  }

  const overlappingContact = aAliasValues.find((left) =>
    (left.kind === "email" || left.kind === "whatsapp" || left.kind === "phone") &&
    bAliasValues.some((right) => right.kind === left.kind && right.value === left.value),
  );
  if (overlappingContact) {
    score += 5;
    signals.push(`${overlappingContact.kind} coincidente`);
  }

  return { score, signals };
}

function pickPrimaryGuest(a: GuestSuggestionInput, b: GuestSuggestionInput): GuestSuggestionInput {
  const aHasName = Boolean(normalizeText(a.name));
  const bHasName = Boolean(normalizeText(b.name));
  if (aHasName !== bHasName) return aHasName ? a : b;

  if (a.conversationCount !== b.conversationCount) {
    return a.conversationCount > b.conversationCount ? a : b;
  }

  if (a.aliases.length !== b.aliases.length) {
    return a.aliases.length >= b.aliases.length ? a : b;
  }

  return activityTimestamp(a) >= activityTimestamp(b) ? a : b;
}

export function buildGuestMergeSuggestions(
  guests: GuestSuggestionInput[],
  limit = 8,
): GuestMergeSuggestion[] {
  const candidates = guests.filter((guest) => !guest.absorbed);
  const suggestions: GuestMergeSuggestion[] = [];

  for (let i = 0; i < candidates.length; i += 1) {
    for (let j = i + 1; j < candidates.length; j += 1) {
      const left = candidates[i];
      const right = candidates[j];
      if (left.guestId === right.guestId) continue;

      const { score, signals } = buildSignals(left, right);
      if (score < 3 || signals.length === 0) continue;

      const primary = pickPrimaryGuest(left, right);
      const secondary = primary.guestId === left.guestId ? right : left;

      suggestions.push({
        key: `${primary.guestId}__${secondary.guestId}`,
        primaryGuestId: primary.guestId,
        secondaryGuestId: secondary.guestId,
        score,
        severity: score >= 6 ? "high" : score >= 4 ? "medium" : "low",
        signals: Array.from(new Set(signals)),
      });
    }
  }

  suggestions.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.key.localeCompare(b.key);
  });

  return suggestions.slice(0, limit);
}
