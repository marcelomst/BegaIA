// Path: /root/begasist/lib/auth/roles.ts
import {
  ROLE_TECHNICAL_SUPER,
  ROLE_TECHNICAL,
  ROLE_MANAGER,
  ROLE_STANDARD,
} from "@/types/roles";

/** Clasificación básica */
export const isSuper = (r: number) => r === ROLE_TECHNICAL_SUPER; // 0
export const isTechnical = (r: number) => ROLE_TECHNICAL.includes(r); // 1..9
export const isManager = (r: number) => ROLE_MANAGER.includes(r);     // 10..19
export const isStandard = (r: number) => ROLE_STANDARD.includes(r);   // 20..29

/** Alias útiles */
export const isReception = (r: number) => r === 20;
export const isGuest = (r: number) => r >= 30;

/** Usuarios “de sistema” → únicamente rol 0 */
export function isSystemUser(roleLevel: number): boolean {
  return isSuper(roleLevel);
}

/** Rol 0 solo válido si hotelId === "system" */
export function isRoleLevelZeroAllowed(hotelId: string, roleLevel: number): boolean {
  return !(roleLevel === ROLE_TECHNICAL_SUPER && hotelId !== "system");
}

/* ---------------------- */
/* Visibilidad DASHBOARD  */
/* ---------------------- */

/** Dashboard /admin/hotels (listado global): solo “system” */
export function canSeeHotelsDashboard(roleLevel: number) {
  return isSystemUser(roleLevel);
}

export function canSeeUploadDashboard(roleLevel: number) {
  return !isReception(roleLevel) && !isGuest(roleLevel);
}

export function canSeeEmbeddingsDashboard(roleLevel: number) {
  return !isReception(roleLevel) && !isGuest(roleLevel);
}

export function canSeePromptsDashboard(roleLevel: number) {
  return isSystemUser(roleLevel);
}

export function canSeeChannelsDashboard(_roleLevel: number) {
  return true; // todos
}

export function canSeeLogsDashboard(roleLevel: number) {
  return isSystemUser(roleLevel);
}

export function canSeeUsersDashboard(roleLevel: number) {
  return isSystemUser(roleLevel) || !isReception(roleLevel);
}

/* ---------------------- */
/* Visibilidad SIDEBAR    */
/* ---------------------- */

/** Sección global /admin/hotels (no confundir con /admin/hotel/*) */
export function canAccessHotelsSection(roleLevel: number) {
  return isSystemUser(roleLevel);
}

/** Sección específica del hotel (ej. /admin/hotel/edit) */
export function canAccessHotelSection(roleLevel: number) {
  return isTechnical(roleLevel) || isManager(roleLevel);
}

export function canAccessUploadSection(roleLevel: number) {
  return !isReception(roleLevel) && !isGuest(roleLevel);
}

export function canAccessEmbeddingsSection(roleLevel: number) {
  return !isReception(roleLevel) && !isGuest(roleLevel);
}

export function canAccessPromptsSection(roleLevel: number) {
  return isSystemUser(roleLevel);
}

export function canAccessChannelsSection(_roleLevel: number) {
  return true;
}

export function canAccessLogsSection(roleLevel: number) {
  return isSystemUser(roleLevel);
}

export function canAccessUsersSection(roleLevel: number) {
  return isSystemUser(roleLevel) || !isReception(roleLevel);
}

export function canAccessChangePasswordSection(_roleLevel: number) {
  return true;
}

/* ---------------------- */
/* Gateo de rutas /admin  */
/* ---------------------- */
export function canAccessAdminRoute(roleLevel: number, pathname: string) {
  // System ve todo
  if (isSystemUser(roleLevel)) return true;

  // Generador del snippet del widget → SOLO técnicos (1..9)
  if (
    (pathname.startsWith("/admin/hotels/") && pathname.endsWith("/widget")) ||
    (pathname.startsWith("/admin/hotel/") && pathname.endsWith("/widget"))
  ) {
    return isTechnical(roleLevel);
  }

  // Listado global de hoteles → sólo system
  if (pathname.startsWith("/admin/hotels")) {
    return false;
  }

  // Secciones “técnicas”
  if (
    pathname.startsWith("/admin/prompts") ||
    pathname.startsWith("/admin/embeddings") ||
    pathname.startsWith("/admin/logs")
  ) {
    return isTechnical(roleLevel);
  }

  // General: técnicos y managers acceden; recepción limitada
  if (isTechnical(roleLevel) || isManager(roleLevel)) return true;

  // Recepción puede ver canales, cambiar password y home
  if (
    pathname.startsWith("/admin/channels") ||
    pathname.startsWith("/auth/change-password") ||
    pathname === "/admin"
  ) {
    return true;
  }

  return false;
}

// --- Back-compat / alias esperados por otros módulos ---
export const isHotelTech = (r: number) => isTechnical(r); // 1..9
export const isHotelAdmin = (r: number) => isManager(r);  // 10..19
