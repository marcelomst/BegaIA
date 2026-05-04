import type { Guest } from "@/types/channel";
import { firstNameOf, normalizeNameCase } from "@/lib/agents/helpers";

function normalizeName(value?: string | null): string {
  return String(value || "")
    .trim()
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s{2,}/g, " ");
}

function looksCanonicalConversationalName(value?: string | null): boolean {
  const normalized = normalizeName(value);
  if (!normalized || normalized.length < 2 || normalized.length > 60) return false;
  if (/[0-9@/\\]/.test(normalized)) return false;
  return /^[\p{L}][\p{L}'’. -]*$/u.test(normalized);
}

export function getConversationalDisplayName(guest?: Partial<Guest> | null): string | undefined {
  const canonicalFirstName = normalizeName(guest?.firstName);
  if (looksCanonicalConversationalName(canonicalFirstName)) {
    return normalizeNameCase(canonicalFirstName);
  }

  const canonicalFullName = normalizeName(
    [normalizeName(guest?.firstName), normalizeName(guest?.lastName)].filter(Boolean).join(" ") || guest?.name
  );
  if (!looksCanonicalConversationalName(canonicalFullName)) return undefined;

  const displayName = firstNameOf(normalizeNameCase(canonicalFullName)) || normalizeNameCase(canonicalFullName);
  return looksCanonicalConversationalName(displayName) ? displayName : undefined;
}
