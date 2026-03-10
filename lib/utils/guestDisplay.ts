// Path: /root/begasist/lib/utils/guestDisplay.ts

type GuestDisplayInput = {
  guestId: string | null | undefined;
  name?: string | null;
  aliases?: Array<string | null | undefined>;
  channel?: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function compactGuestId(value: string): string {
  if (value.length <= 10) return value;
  return value.slice(0, 8);
}

function compactEmail(value: string): string {
  const [user, domain] = value.split("@");
  if (!user || !domain) return value;
  if (user.length <= 3) return `${user}@${domain}`;
  return `${user.slice(0, 3)}...@${domain}`;
}

function humanizeAlias(alias: string): string | null {
  const idx = alias.indexOf(":");
  if (idx <= 0) return null;

  const kind = alias.slice(0, idx).trim().toLowerCase();
  const rawValue = alias.slice(idx + 1).trim();
  if (!rawValue) return null;

  if (kind === "whatsapp" || kind === "phone") {
    return `WhatsApp ${rawValue}`;
  }
  if (kind === "email") {
    return `Email ${compactEmail(rawValue)}`;
  }
  if (kind === "web") {
    return "Web guest";
  }

  const label = kind.charAt(0).toUpperCase() + kind.slice(1);
  return `${label} ${rawValue}`;
}

function pickReadableAlias(aliases: Array<string | null | undefined>, channel?: string | null): string | null {
  const normalized = aliases.map(normalizeText).filter(Boolean);
  if (normalized.length === 0) return null;

  const preferredKinds = channel ? [channel.toLowerCase(), "whatsapp", "email", "web"] : ["whatsapp", "email", "web"];
  for (const kind of preferredKinds) {
    const match = normalized.find((alias) => alias.toLowerCase().startsWith(`${kind}:`));
    if (match) return humanizeAlias(match);
  }

  return humanizeAlias(normalized[0]);
}

export function getGuestDisplayName(input: GuestDisplayInput): string {
  const name = normalizeText(input.name);
  if (name) return name;

  const aliasLabel = pickReadableAlias(input.aliases ?? [], input.channel);
  if (aliasLabel) return aliasLabel;

  const guestId = normalizeText(input.guestId);
  if (!guestId) return "Guest";
  return `Guest ${compactGuestId(guestId)}`;
}
