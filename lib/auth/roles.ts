// /lib/auth/roles.ts

export enum RoleLevel {
  SuperAdmin = 0,        // Acceso total solo para hotelId 'system'
  SysAdmin = 0.1,        // Acceso admin a hoteles globales
  SysSupport = 0.2,      // Soporte hoteles globales
  HotelTechMin = 1,      // Técnicos hotel (sin acceso a hoteles globales)
  HotelTechMax = 9.99,
  HotelAdmin = 10,
  Reception = 20,
  Guest = 30,
}

/**
 * Solo hotelId === "system" puede tener usuarios con roleLevel 0.
 */
export function isRoleLevelZeroAllowed(hotelId: string, roleLevel: number): boolean {
  return !(roleLevel === 0 && hotelId !== "system");
}

// Usuarios de sistema (0, 0.1, 0.2)
export function isSystemUser(roleLevel: number): boolean {
  return roleLevel >= RoleLevel.SuperAdmin && roleLevel < RoleLevel.HotelTechMin;
}

// Técnicos de hotel (1 <= roleLevel < 10)
export function isHotelTech(roleLevel: number): boolean {
  return roleLevel >= RoleLevel.HotelTechMin && roleLevel < RoleLevel.HotelAdmin;
}

// Admins y superiores (10 <= roleLevel < 20)
export function isHotelAdmin(roleLevel: number): boolean {
  return roleLevel >= RoleLevel.HotelAdmin && roleLevel < RoleLevel.Reception;
}

// Recepcionistas (20)
export function isReception(roleLevel: number): boolean {
  return roleLevel === RoleLevel.Reception;
}

// Guest (30)
export function isGuest(roleLevel: number): boolean {
  return roleLevel === RoleLevel.Guest;
}

// --- CARD HELPERS ---
// Helpers para mostrar/ocultar tarjetas del dashboard
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

export function canSeeChannelsDashboard(roleLevel: number) {
  return true; // Todos los usuarios pueden ver canales
}

export function canSeeLogsDashboard(roleLevel: number) {
  return isSystemUser(roleLevel);
}

export function canSeeUsersDashboard(roleLevel: number) {
  return !isReception(roleLevel) || isSystemUser(roleLevel);
}

// --- RUTA HELPERS (SIDEBAR, ETC) ---
export function canAccessHotelsSection(roleLevel: number) {
  return isSystemUser(roleLevel);
}
export function canAccessHotelSection(roleLevel: number) {
  return isHotelAdmin(roleLevel)|| isHotelTech(roleLevel) ;
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
export function canAccessChannelsSection(roleLevel: number) {
  return true;
}
export function canAccessLogsSection(roleLevel: number) {
  return isSystemUser(roleLevel);
}
export function canAccessUsersSection(roleLevel: number) {
  return !isReception(roleLevel) || isSystemUser(roleLevel);
}
export function canAccessChangePasswordSection(roleLevel: number) {
  return true;
}

// Solo usuarios de sistema (0), técnicos (<10), admins (10-19) pueden acceder a rutas admin generales
export function canAccessAdminRoute(roleLevel: number, pathname: string) {
  if (roleLevel < RoleLevel.Reception) return true; // Admins, técnicos, gerentes pueden acceder a todo
  // Solo canales y cambio de password para recepcionistas
  if (
    pathname.startsWith("/admin/channels") ||
    pathname.startsWith("/auth/change-password") ||
    pathname === "/admin"
  ) {
    return true;
  }
  return false;
}
