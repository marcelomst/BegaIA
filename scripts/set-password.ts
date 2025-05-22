// scripts/set-password.ts
import { hash } from "bcryptjs";
import { getHotelConfig, updateHotelConfig } from "../lib/config/hotelConfig.server";

async function run() {
  const hotelId = "hotel999"; // actualizá si corresponde
  const email = "marcelomst1@gmail.com";
  const newPassword = "marcelo123";

  const config = await getHotelConfig(hotelId);
  if (!config || !Array.isArray(config.users)) throw new Error("❌ Configuración inválida");

  const user = config.users.find(u => u.email === email);
  if (!user) throw new Error("❌ Usuario no encontrado");

  user.passwordHash = await hash(newPassword, 10);
  user.active = true;
  user.verificationToken = undefined;

  await updateHotelConfig(hotelId, { users: config.users });
  console.log("✅ Contraseña actualizada para:", email);
}

run();
