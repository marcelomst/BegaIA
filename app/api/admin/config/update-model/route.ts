// Path: /root/begasist/app/api/admin/config/update-model/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig, updateHotelConfig } from "@/lib/config/hotelConfig.server";

export async function POST(req: NextRequest) {
  const { hotelId, model } = await req.json();

  if (!hotelId || !model) {
    return NextResponse.json({ success: false, error: "hotelId o model faltante" }, { status: 400 });
  }

  const current = await getHotelConfig(hotelId);
  const existingEmail = current?.channelConfigs?.email;

  if (!existingEmail) {
    return NextResponse.json({ success: false, error: "No hay configuración previa de email" }, { status: 404 });
  }

  await updateHotelConfig(hotelId, {
    channelConfigs: {
      email: {
        ...existingEmail,
        preferredCurationModel: model, // 👈 solo cambiamos este campo
      },
    },
  });

  return NextResponse.json({ success: true });
}
