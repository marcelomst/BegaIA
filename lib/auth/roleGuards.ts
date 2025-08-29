// Path: /root/begasist/lib/auth/roleGuards.ts
import {
  ROLE_TECHNICAL_SUPER,
  ROLE_TECHNICAL,
  ROLE_MANAGER,
  ROLE_STANDARD,
} from "@/types/roles";
import {
  isSystemUser,
  isHotelAdmin as isManagerLike,
  isHotelTech as isTechLike,
  isReception,
  isRoleLevelZeroAllowed,
} from "@/lib/auth/roles";

/** Normaliza y valida que sea entero y dentro de 0..29 */
export function normalizeRoleLevel(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error("roleLevel inválido");
  const i = Math.trunc(n);
  if (i < 0 || i > 29) throw new Error("roleLevel fuera de rango (0..29)");
  return i;
}

/** ¿Está en alguno de los buckets válidos del sistema? */
export function isKnownRole(i: number): boolean {
  return (
    i === ROLE_TECHNICAL_SUPER ||
    ROLE_TECHNICAL.includes(i) ||
    ROLE_MANAGER.includes(i) ||
    ROLE_STANDARD.includes(i)
  );
}

/**
 * Reglas de actualización de roles:
 * - rol 0 solo si hotelId === "system" (y solo por usuario “system”).
 * - recepción (20) no puede actualizar roles.
 * - usuarios no-system solo pueden modificar usuarios de SU MISMO hotel.
 * - usuarios no-system no pueden asignar rol 0.
 */
export function assertRoleUpdateAllowed(params: {
  actor: { roleLevel: number; hotelId: string };
  target: { hotelId: string };
  newRoleLevel: number;
}) {
  const { actor, target, newRoleLevel } = params;

  if (isReception(actor.roleLevel)) {
    throw new Error("No autorizado: recepción no puede cambiar roles");
  }

  // rol 0: solo system y solo en hotel 'system'
  if (newRoleLevel === ROLE_TECHNICAL_SUPER) {
    if (!isSystemUser(actor.roleLevel)) {
      throw new Error("No autorizado: solo system puede asignar rol 0");
    }
    if (!isRoleLevelZeroAllowed(target.hotelId, newRoleLevel)) {
      throw new Error("Rol 0 solo permitido para hotelId 'system'");
    }
  }

  // Si no es system → solo mismo hotel
  if (!isSystemUser(actor.roleLevel) && actor.hotelId !== target.hotelId) {
    throw new Error("No autorizado: solo puedes modificar usuarios de tu hotel");
  }

  // Usuarios no-system no pueden asignar 0
  if (!isSystemUser(actor.roleLevel) && newRoleLevel === ROLE_TECHNICAL_SUPER) {
    throw new Error("No autorizado: no puedes asignar rol 0");
  }

  // (Opcional) Podrías limitar escaladas: por ahora técnicos/managers pueden poner 1..29.
  if (!isSystemUser(actor.roleLevel)) {
    if (newRoleLevel < 1 || newRoleLevel > 29) {
      throw new Error("Rol inválido para usuarios no-system");
    }
  }
}
