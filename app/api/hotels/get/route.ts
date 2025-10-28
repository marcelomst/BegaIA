// /app/api/hotels/get/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const hotelId = url.searchParams.get("hotelId");

  if (!hotelId) {
    return NextResponse.json({ error: "Falta hotelId" }, { status: 400 });
  }

  const config = await getHotelConfig(hotelId);
  if (!config) {
    return NextResponse.json({ error: "Hotel no encontrado" }, { status: 404 });
  }
  // Sanitización: asegurar estructura canónica
  const canonical = {
    hotelId: config.hotelId ?? hotelId,
    hotelName: config.hotelName ?? '',
    address: config.address ?? '',
    city: config.city ?? '',
    country: config.country ?? '',
    postalCode: config.postalCode ?? '',
    phone: config.phone ?? '',
    timezone: config.timezone ?? '',
    defaultLanguage: config.defaultLanguage ?? 'es',
    contacts: config.contacts ?? {},
    schedules: config.schedules ?? {},
    amenities: config.amenities ?? {},
    payments: config.payments ?? {},
    billing: config.billing ?? {},
    policies: config.policies ?? {},
    rooms: config.rooms ?? [],
    reservations: config.reservations ?? {},
    channelConfigs: config.channelConfigs ?? {},
    airports: config.airports ?? [],
    transport: config.transport ?? {},
    attractions: config.attractions ?? [],
    // ...otros campos opcionales
  };
  return NextResponse.json({ hotel: canonical });
}
