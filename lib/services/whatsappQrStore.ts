// Path: /root/begasist/lib/services/whatsappQrStore.ts

// Simple store temporal en memoria para los QR. En producción: usar Redis.
const qrStore: Record<string, string> = {};

export function setWhatsAppQr(hotelId: string, qr: string) {
  qrStore[hotelId] = qr;
}

export function getWhatsAppQr(hotelId: string): string | null {
  return qrStore[hotelId] || null;
}

export function clearWhatsAppQr(hotelId: string) {
  delete qrStore[hotelId];
}
