// /root/begasist/scripts/generate-new-token.ts
import { getHotelConfig, updateHotelConfig } from "../lib/config/hotelConfig.server";
import { randomUUID } from "crypto";

(async () => {
  const hotelId = "hotel999";
  const config = await getHotelConfig(hotelId);
  const newToken = randomUUID();

  if (!config || !Array.isArray(config.users)) throw new Error("No config");

  const user = config.users.find(u => u.email === "marcelomst1@gmail.com");
  if (!user) throw new Error("Usuario no encontrado");

  user.active = false;
  user.verificationToken = newToken;

  await updateHotelConfig(hotelId, { users: config.users });
  console.log("🆕 Nuevo token de verificación:", newToken);
})();
