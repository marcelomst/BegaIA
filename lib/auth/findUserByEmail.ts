// /lib/auth/findUserByEmail.ts

import { getHotelConfigCollection } from "@/lib/config/hotelConfig.server";
import type { HotelUser } from "@/types/user";

/**
 * Busca TODOS los usuarios activos con login local por email,
 * en todos los hoteles, y retorna un array con hotelId.
 */
export async function findUserByEmail(email: string): Promise<(HotelUser & { hotelId: string })[]> {
  // Traé TODOS los hoteles (sin filtro por email)
  const collection = getHotelConfigCollection();
  const cursor = await collection.find({});
  const docs = await cursor.toArray();

  const users: (HotelUser & { hotelId: string })[] = [];

  for (const doc of docs) {
    for (const u of doc.users ?? []) {
      if (
        u.email === email &&      // email exacto
        u.active === true &&      // solo activos
        !!u.passwordHash          // solo login local
      ) {
        users.push({ ...u, hotelId: doc.hotelId });
      }
    }
  }

  return users;
}
