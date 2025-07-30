// Path: /root/begasist/lib/api/admin/updateModel.ts

import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server.ts";
import type { EmailConfig } from "@/types/channel";
import type { CurationModel } from "@/types/channel";

export type UpdateModelPayload = {
  hotelId: string;
  preferredCurationModel: CurationModel;
};

export async function updateEmailCurationModel({ hotelId, preferredCurationModel }: UpdateModelPayload) {
  const config = await getHotelConfig(hotelId);
  if (!config) throw new Error(`No se encontró configuración para hotelId=${hotelId}`);

  const prevEmailConfig = config.channelConfigs?.email;
  if (!prevEmailConfig) throw new Error(`No hay configuración de email para hotelId=${hotelId}`);

  const updatedEmailConfig: EmailConfig = {
    ...prevEmailConfig,
    preferredCurationModel,
  };

  const updated = await updateHotelConfig(hotelId, {
    channelConfigs: {
      ...config.channelConfigs,
      email: updatedEmailConfig,
    },
  });

  return updated;
}
