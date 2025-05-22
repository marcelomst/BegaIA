// /lib/auth/checkRoleLevel.ts
/**
 * Solo hotelId === "system" puede tener usuarios con roleLevel 0.
 * Devuelve true si es válido, false si hay que bloquearlo.
 */
export function isRoleLevelZeroAllowed(hotelId: string, roleLevel: number) {
  return !(roleLevel === 0 && hotelId !== "system");
}
