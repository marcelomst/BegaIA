// Path: /root/begasist/lib/services/emailPollingState.ts

import { redis } from "@/lib/services/redis";

const EMAIL_POLLING_PREFIX = "email_polling:";

// Obtener el estado actual del polling para un hotel
export async function getEmailPollingState(hotelId: string): Promise<boolean> {
  const key = EMAIL_POLLING_PREFIX + hotelId;
  const value = await redis.get(key);
  return value === "true";
}

// Cambiar el estado de polling para un hotel
export async function setEmailPollingState(hotelId: string, enabled: boolean): Promise<void> {
  const key = EMAIL_POLLING_PREFIX + hotelId;
  await redis.set(key, enabled.toString());
}
