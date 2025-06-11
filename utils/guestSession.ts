// Path: /root/begasist/utils/guestSession.ts

export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  let guestId = localStorage.getItem("guestId");
  if (!guestId) {
    guestId = crypto.randomUUID();
    localStorage.setItem("guestId", guestId);
  }
  return guestId;
}
