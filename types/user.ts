// /types/user.ts

import type { RoleLevel } from "./roles";

/**
 * Usuario persistido en hotel_config.users[]
 */
export interface HotelUser {
  userId: string;
  email: string;
  name?: string;
  position?: string;
  roleLevel: RoleLevel;
  active: boolean;

  // Login local
  passwordHash?: string;

  // Login federado
  federatedProvider?: "google" | "microsoft" | "okta";
  federatedId?: string;

  // Tokens y timestamps
  createdAt?: string;
  updatedAt?: string;
  verificationToken?: string;
  resetToken?: string;
  resetTokenExpires?: string;
}

/**
 * Usuario activo durante la sesión (respuesta de /api/me)
 */
export interface CurrentUser {
  userId: string;
  email: string;
  hotelId: string;
  hotelName: string;
  roleLevel: RoleLevel;
  defaultLanguage?: string;   // 👈 Agregá este campo
}
