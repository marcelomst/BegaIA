// /lib/auth/verifyUserAccount.ts
import { getAllHotelConfigs, updateHotelConfig } from "@/lib/config/hotelConfig.server";

export type VerifyResult =
  | { ok: true; email: string; hotelId: string; roleLevel: number }
  | { ok: false; error: string };

export async function verifyUserAccount(token: string): Promise<VerifyResult> {
  const allConfigs = await getAllHotelConfigs();

  const hotel = allConfigs.find((cfg) =>
    cfg.users?.some((u) => u.verificationToken === token)
  );

  if (!hotel) {
    return { ok: false, error: "Token inválido o expirado" };
  }

  const user = hotel.users!.find((u) => u.verificationToken === token);
  if (!user) {
    return { ok: false, error: "Token no válido" };
  }

  user.active = true;
  delete user.verificationToken;

  await updateHotelConfig(hotel.hotelId, { users: hotel.users });

  return {
    ok: true,
    email: user.email,
    hotelId: hotel.hotelId,
    roleLevel: user.roleLevel,
  };
}
