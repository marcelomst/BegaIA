// /utils/conversationSession.ts
export function getConversationId(): string | null {
  if (typeof window === "undefined") return null;
  const localValue = localStorage.getItem("conversationId");
  if (localValue !== null) return localValue;
  const cookieValue = getCookie("conversationId");
  return cookieValue !== undefined ? cookieValue : null;
}
export function hasConversationId(): boolean {
  if (typeof window === "undefined") return false;
  const localValue = localStorage.getItem("conversationId");
  if (localValue !== null) return true;
  const cookieValue = getCookie("conversationId");
  return cookieValue !== undefined;
}

export function setConversationId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("conversationId", id);
    setCookie("conversationId", id, 365);
  }
}

export function getLang(): string {
  if (typeof window === "undefined") return "es";
  return localStorage.getItem("lang") || getCookie("lang") || "es";
}

export function setLang(lang: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("lang", lang);
    setCookie("lang", lang, 365);
  }
}

// Helpers simples para cookie
function getCookie(name: string): string | undefined {
  const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
  return v ? v[2] : undefined;
}
function setCookie(name: string, value: string, days: number) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${d.toUTCString()};path=/`;
}
// Resetea la sesión de conversación y el idioma
// (por ejemplo, al cerrar sesión o al cambiar de usuario)
// Se usa para limpiar el estado del usuario en la aplicación
// y en el servidor.
// También borra las cookies asociadas.
// por ejemplo, al cerrar sesión o al cambiar de usuario.
export function resetConversationSession() {
  try {
    localStorage.removeItem("conversationId");
    localStorage.removeItem("lang");
    // También borrá el cookie (lo setea con expiración pasada)
    document.cookie = "conversationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "lang=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  } catch {}
}