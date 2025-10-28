// MOCK: Tipos de guest para evitar errores de compilación
export type Guest = {
    name?: string;
    email?: string;
    phone?: string;
    mode?: GuestMode;
};
export type GuestMode = "automatic" | "manual" | "supervised";
// ⚠️ Este archivo es un mock. Revisar y ajustar según la lógica real del proyecto.