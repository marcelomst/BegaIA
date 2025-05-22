// /lib/db/getHotelsForUser.ts

import { collection } from "@/lib/config/hotelConfig.server";

/**
 * Devuelve todos los hoteles donde el userId existe y está activo.
 */
export async function getHotelsForUser(
  userId: string
): Promise<{ hotelId: string; name: string }[]> {
  const results = await collection
    .find({ "users.userId": userId })
    .toArray();

  // Solo hoteles donde el user está activo
  return results
    .filter((doc: any) =>
      Array.isArray(doc.users) &&
      doc.users.some((u: any) => u.userId === userId && u.active === true)
    )
    .map((doc: any) => ({
      hotelId: doc.hotelId!,
      name: doc.hotelName ?? "(Sin nombre)",
    }));
}
