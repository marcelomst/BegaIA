// Path: /root/begasist/utils/guestSession.ts

const GUEST_ID_STORAGE_KEY = "guestId";

function buildGuestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `guest-${crypto.randomUUID()}`;
  }
  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  const existing = String(sessionStorage.getItem(GUEST_ID_STORAGE_KEY) ?? "").trim();
  if (existing && existing !== "web-guest") {
    return existing;
  }
  const guestId = buildGuestId();
  sessionStorage.setItem(GUEST_ID_STORAGE_KEY, guestId);
  return guestId;
}
