// /types/user.ts

import type { RoleLevel } from "./roles";

export interface HotelUser {
  userId: string;         // UUID o string único
  email: string;
  name?: string;
  position?: string;      // ej: "Recepcionista", "Gerente"
  roleLevel: RoleLevel;
  active: boolean;
  passwordHash?: string;  // login local
  federatedProvider?: "google" | "microsoft" | "okta";
  federatedId?: string;   // ID del proveedor externo
  createdAt?: string;
}
