// /scripts/fix-users-add-userId.ts
import { getAllHotelConfigs, updateHotelConfig } from "../lib/config/hotelConfig.server";
import { v4 as uuidv4 } from "uuid";

async function fixUsers() {
  const configs = await getAllHotelConfigs();

  for (const config of configs) {
    if (!config.users) continue;

    let modified = false;

    config.users = config.users.map((u) => {
      if (!u.userId) {
        return { ...u, userId: uuidv4() }; // agrega userId nuevo si no existe
      }
      return u;
    });

    modified = true;

    if (modified) {
      await updateHotelConfig(config.hotelId, { users: config.users });
      console.log(`✅ Actualizado hotel ${config.hotelId}`);
    }
  }

  console.log("✅ Proceso completo.");
}

fixUsers().catch(console.error);
