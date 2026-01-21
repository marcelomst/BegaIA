// Path: /root/begasist/lib/rooms/roomIcons.ts

function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeRoomName(roomName: string): string {
  return stripAccents(roomName || "").toLowerCase();
}

export function suggestRoomIcon(roomName: string): string {
  const name = normalizeRoomName(roomName);
  if (!name) return "🛏️";

  if (/(accesible|accessible|pmr)/i.test(name)) return "♿";
  if (/(suite)/i.test(name)) return "👑";
  if (/(deluxe|superior|premium)/i.test(name)) return "✨";
  if (/(familiar|family)/i.test(name)) return "👨‍👩‍👧‍👦";
  if (/(triple)/i.test(name)) return "👨‍👩‍👧";
  if (/(twin)/i.test(name)) return "🛏️🛏️";
  if (/(doble|double|matrimonial|queen)/i.test(name)) return "🛏️🛏️";
  if (/(single|individual|simple)/i.test(name)) return "🛏️";
  if (/(vista al mar|sea view|ocean view)/i.test(name)) return "🌊";

  return "🛏️";
}
