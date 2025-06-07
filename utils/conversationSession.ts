// /utils/conversationSession.ts
export function getConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("conversationId") || getCookie("conversationId");
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
