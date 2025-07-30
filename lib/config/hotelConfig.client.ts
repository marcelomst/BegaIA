// Path: /root/begasist/lib/config/hotelConfig.client.ts
export async function fetchHotelConfig(hotelId: string) {
  const res = await fetch(`/api/config?hotelId=${hotelId}`);
  if (!res.ok) throw new Error("No se pudo traer la configuración del hotel");
  console.log("✅ [hotelConfig] Configuración del hotel traída correctamente:", hotelId);
  return await res.json();
}
