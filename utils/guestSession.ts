// Path: /root/begasist/utils/guestSession.ts
import { getScopedSessionKey } from "@/utils/webTabScope";

const GUEST_ID_STORAGE_KEY = "guestId";
const GUEST_ID_PREFIX = "begai:guestId";
const LEGACY_GUEST_ID_PREFIX = "begasist:guestId";

function normalizeHotelId(hotelId?: string): string {
  return String(hotelId || "hotel-demo").trim() || "hotel-demo";
}

function guestStorageKey(hotelId?: string): string {
  return `${GUEST_ID_PREFIX}:${normalizeHotelId(hotelId)}`;
}

function legacyGuestStorageKey(hotelId?: string): string {
  return `${LEGACY_GUEST_ID_PREFIX}:${normalizeHotelId(hotelId)}`;
}

function isValidGuestId(value: unknown): value is string {
  const normalized = String(value || "").trim();
  return Boolean(normalized && normalized !== "undefined" && normalized !== "null" && normalized !== "web-guest");
}

function buildGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateGuestId(hotelId?: string): string {
  if (typeof window === "undefined") return "";
  const storageKey = guestStorageKey(hotelId);
  const persisted = localStorage.getItem(storageKey);
  if (isValidGuestId(persisted)) return persisted.trim();

  const legacyPersisted = localStorage.getItem(legacyGuestStorageKey(hotelId));
  if (isValidGuestId(legacyPersisted)) {
    localStorage.setItem(storageKey, legacyPersisted.trim());
    return legacyPersisted.trim();
  }

  // Upgrade the active tab's previous session-only identity without sharing it again.
  const legacySessionKey = getScopedSessionKey(GUEST_ID_STORAGE_KEY);
  const legacySessionGuest = sessionStorage.getItem(legacySessionKey);
  if (isValidGuestId(legacySessionGuest)) {
    sessionStorage.removeItem(legacySessionKey);
    localStorage.setItem(storageKey, legacySessionGuest.trim());
    return legacySessionGuest.trim();
  }
  const guestId = buildGuestId();
  localStorage.setItem(storageKey, guestId);
  return guestId;
}
