import type { Guest, Identifier } from "@/types/channel";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmailValue(value: unknown): string {
  const email = normalizeText(value).toLowerCase();
  return email ? `email:${email}` : "";
}

function addAlias(target: Set<string>, value: unknown) {
  const normalized = normalizeText(value);
  if (normalized) target.add(normalized);
}

function addIdentifierValue(target: Set<string>, type: Identifier["type"], value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) return;

  if (type === "email") {
    target.add(normalizeEmailValue(normalized));
    target.add(normalized.toLowerCase());
    return;
  }

  if (type === "wa") {
    target.add(normalized);
    target.add(`whatsapp:${normalized}`);
    return;
  }

  if (type === "phone") {
    target.add(normalized);
    target.add(`whatsapp:${normalized}`);
    return;
  }

  if (type === "web_id") {
    target.add(normalized);
    target.add(`web:${normalized}`);
    return;
  }

  target.add(normalized);
}

export function deriveGuestReadAliases(
  guest: Guest | null | undefined,
  explicitAliases: Array<string | null | undefined> = [],
): string[] {
  const aliases = new Set<string>();

  explicitAliases.forEach((alias) => addAlias(aliases, alias));
  (Array.isArray(guest?.aliases) ? guest.aliases : []).forEach((alias) => addAlias(aliases, alias));

  const email = normalizeText(guest?.email);
  if (email) {
    aliases.add(email.toLowerCase());
    aliases.add(normalizeEmailValue(email));
  }

  const phone = normalizeText(guest?.phone);
  if (phone) {
    aliases.add(phone);
    aliases.add(`whatsapp:${phone}`);
  }

  const identifiers = guest?.identifiers;
  if (identifiers) {
    addIdentifierValue(aliases, "email", identifiers.email);
    addIdentifierValue(aliases, "phone", identifiers.phoneE164);
    addIdentifierValue(aliases, "wa", identifiers.whatsappId);
    addIdentifierValue(aliases, "web_id", identifiers.web_id);
    addIdentifierValue(aliases, "doc", identifiers.doc);
  }

  (Array.isArray(guest?.identifiersHistory) ? guest.identifiersHistory : []).forEach((identifier) => {
    addIdentifierValue(aliases, identifier.type, identifier.value);
  });

  return Array.from(aliases);
}
