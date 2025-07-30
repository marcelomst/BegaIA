// /lib/utils/isValidInternationalPhone.ts
export function isValidInternationalPhone(phone: string): boolean {
  // E.164: + seguido de 6 a 15 dígitos (ej: +59899912345)
  return /^\+\d{6,15}$/.test(phone.trim());
}
