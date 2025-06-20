// Path: /root/begasist/utils/fetchGuest.ts
import type { Guest } from "@/types/channel";

// Leer perfil
export async function fetchGuest(hotelId: string, guestId: string): Promise<Guest | null> {
  const res = await fetch(`/api/guests/${hotelId}/${guestId}`);
  if (!res.ok) return null;
  return await res.json();
}

// Guardar perfil (puede crear o actualizar)
export async function saveGuest(
  hotelId: string,
  guestId: string,
  updates: Partial<Guest>
): Promise<Guest | null> {
  const res = await fetch(`/api/guests/${hotelId}/${guestId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) return null;
  return await res.json();
}
