// MOCK: API de guests para evitar errores de compilación
// ⚠️ Este archivo es un mock. Revisar y ajustar según la lógica real del proyecto.

export async function fetchGuest(hotelId: string, guestId: string): Promise<any> {
    // Simulación: retorna un guest vacío
    return { name: "Invitado", email: "", phone: "", mode: "automatic" };
}

export async function saveGuest(hotelId: string, guestId: string, data: any): Promise<void> {
    // Simulación: no hace nada
    return;
}
