// /lib/config/getInitialHotelConfig.ts

import { randomUUID } from "crypto";
import type { HotelConfig } from "@/types/channel";
import type { HotelUser } from "@/types/user";

export function getInitialHotelConfig(params: {
  hotelId: string;
  hotelName: string;
  timezone: string;
  defaultLanguage?: string;
  adminEmail: string;
  adminPasswordHash: string;
  adminRoleLevel?: number;
}): HotelConfig {
  const {
    hotelId,
    hotelName,
    timezone,
    defaultLanguage = "es",
    adminEmail,
    adminPasswordHash,
    adminRoleLevel = 10,
  } = params;

  const now = new Date().toISOString();

  const adminUser: HotelUser = {
    userId: randomUUID(),
    email: adminEmail,
    passwordHash: adminPasswordHash,
    roleLevel: adminRoleLevel,
    active: true,
    createdAt: now,
    name: "Administrador",
    position: "Administrador",
  };

  return {
    hotelId,
    hotelName,
    timezone,
    defaultLanguage,
    channelConfigs: {}, // vacía, puede completarse luego
    users: [adminUser],
    lastUpdated: now,
  };
}
