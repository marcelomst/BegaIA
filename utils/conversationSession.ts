// /utils/conversationSession.ts
import { getScopedSessionKey } from "@/utils/webTabScope";

const CONVERSATION_ID_STORAGE_KEY = "conversationId";
const GUEST_ID_STORAGE_KEY = "guestId";
const GUEST_CONVERSATION_BUNDLE_KEY = "guestWebConversation.v1";
const GUEST_PENDING_TURN_KEY = "guestWebPendingTurn.v1";

export type GuestConversationSessionBundle = {
  version: 1;
  hotelId: string;
  conversationId: string;
  capability: string;
  expiresAt: string;
};

export type GuestConversationBundleStatus = "missing" | "valid" | "expired" | "invalid";

export type GuestPendingTurnStatus = "prepared" | "sending" | "uncertain" | "confirmed";

export type GuestPendingTurn = {
  version: 1;
  hotelId: string;
  conversationId: string;
  messageId: string;
  text: string;
  status: GuestPendingTurnStatus;
  preparedAt: string;
  updatedAt: string;
};

type GuestPendingTurnLocator = {
  version: 1;
  hotelId: string;
  conversationId: string;
  messageId: string;
};

function pendingTurnKey(hotelId: string, conversationId: string): string {
  return getScopedSessionKey(
    `${GUEST_PENDING_TURN_KEY}:${encodeURIComponent(hotelId)}:${encodeURIComponent(conversationId)}`,
  );
}

function pendingTurnIndexKey(hotelId: string): string {
  return getScopedSessionKey(`${GUEST_PENDING_TURN_KEY}:index:${encodeURIComponent(hotelId)}`);
}

function readPendingTurnLocator(hotelId: string): GuestPendingTurnLocator | null {
  const key = pendingTurnIndexKey(hotelId);
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "null") as Partial<GuestPendingTurnLocator> | null;
    if (
      !parsed || parsed.version !== 1 || parsed.hotelId !== hotelId ||
      typeof parsed.conversationId !== "string" || !parsed.conversationId ||
      typeof parsed.messageId !== "string" || !/^[A-Za-z0-9._:-]{8,180}$/.test(parsed.messageId)
    ) {
      if (parsed) sessionStorage.removeItem(key);
      return null;
    }
    return parsed as GuestPendingTurnLocator;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

function writePendingTurn(turn: GuestPendingTurn): GuestPendingTurn {
  sessionStorage.setItem(pendingTurnKey(turn.hotelId, turn.conversationId), JSON.stringify(turn));
  const locator: GuestPendingTurnLocator = {
    version: 1,
    hotelId: turn.hotelId,
    conversationId: turn.conversationId,
    messageId: turn.messageId,
  };
  sessionStorage.setItem(pendingTurnIndexKey(turn.hotelId), JSON.stringify(locator));
  return turn;
}

function clearPendingTurnLocator(turn: Pick<GuestPendingTurn, "hotelId" | "conversationId" | "messageId">): void {
  const locator = readPendingTurnLocator(turn.hotelId);
  if (locator?.conversationId === turn.conversationId && locator.messageId === turn.messageId) {
    sessionStorage.removeItem(pendingTurnIndexKey(turn.hotelId));
  }
}

function validPendingTurn(
  value: Partial<GuestPendingTurn> | null,
  hotelId: string,
  conversationId: string,
): value is GuestPendingTurn {
  if (
    !value || value.version !== 1 ||
    value.hotelId !== hotelId || value.conversationId !== conversationId ||
    typeof value.messageId !== "string" || !/^[A-Za-z0-9._:-]{8,180}$/.test(value.messageId) ||
    typeof value.text !== "string" || !value.text.trim() || value.text.length > 3000 ||
    !["prepared", "sending", "uncertain", "confirmed"].includes(String(value.status)) ||
    typeof value.preparedAt !== "string" || !Number.isFinite(Date.parse(value.preparedAt)) ||
    typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt))
  ) return false;
  return true;
}

export function getGuestPendingTurn(hotelId: string, conversationId: string): GuestPendingTurn | null {
  if (typeof window === "undefined" || !hotelId || !conversationId) return null;
  const key = pendingTurnKey(hotelId, conversationId);
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "null") as Partial<GuestPendingTurn> | null;
    if (!validPendingTurn(parsed, hotelId, conversationId)) {
      if (parsed) {
        sessionStorage.removeItem(key);
        if (typeof parsed.messageId === "string") {
          clearPendingTurnLocator({ hotelId, conversationId, messageId: parsed.messageId });
        }
      }
      return null;
    }
    if (parsed.status === "confirmed") {
      sessionStorage.removeItem(key);
      clearPendingTurnLocator(parsed);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function discoverGuestPendingTurn(hotelId: string): GuestPendingTurn | null {
  if (typeof window === "undefined" || !hotelId) return null;
  const locator = readPendingTurnLocator(hotelId);
  if (!locator) return null;
  const pending = getGuestPendingTurn(hotelId, locator.conversationId);
  if (!pending || pending.messageId !== locator.messageId) {
    sessionStorage.removeItem(pendingTurnIndexKey(hotelId));
    return null;
  }
  if (pending.status === "prepared" || pending.status === "sending") {
    return setGuestPendingTurnStatus(pending, "uncertain");
  }
  return pending;
}

export function prepareGuestPendingTurn(input: {
  hotelId: string;
  conversationId: string;
  text: string;
  messageId?: string;
  now?: Date;
}): GuestPendingTurn {
  if (typeof window === "undefined") throw new Error("Guest pending turns require a browser session");
  const text = input.text.trim();
  if (!input.hotelId || !input.conversationId || !text || text.length > 3000) {
    throw new Error("Guest pending turn requires canonical conversation data");
  }
  const locator = readPendingTurnLocator(input.hotelId);
  const existing = locator
    ? getGuestPendingTurn(input.hotelId, locator.conversationId)
    : getGuestPendingTurn(input.hotelId, input.conversationId);
  if (existing) {
    if (existing.conversationId === input.conversationId && existing.text === text) return existing;
    throw new Error("An unresolved Guest turn already exists for this hotel session");
  }
  const messageId = input.messageId ?? crypto.randomUUID();
  if (!/^[A-Za-z0-9._:-]{8,180}$/.test(messageId)) {
    throw new Error("Guest pending turn messageId is invalid");
  }
  const now = (input.now ?? new Date()).toISOString();
  const turn: GuestPendingTurn = {
    version: 1,
    hotelId: input.hotelId,
    conversationId: input.conversationId,
    messageId,
    text,
    status: "prepared",
    preparedAt: now,
    updatedAt: now,
  };
  return writePendingTurn(turn);
}

export function setGuestPendingTurnStatus(
  turn: GuestPendingTurn,
  status: GuestPendingTurnStatus,
  now = new Date(),
): GuestPendingTurn {
  if (typeof window === "undefined") return turn;
  const current = getGuestPendingTurn(turn.hotelId, turn.conversationId);
  if (!current || current.messageId !== turn.messageId || current.text !== turn.text) {
    throw new Error("Guest pending turn identity changed");
  }
  const updated: GuestPendingTurn = { ...current, status, updatedAt: now.toISOString() };
  return writePendingTurn(updated);
}

export function recoverGuestPendingTurn(hotelId: string, conversationId: string): GuestPendingTurn | null {
  const pending = getGuestPendingTurn(hotelId, conversationId);
  if (!pending) return null;
  if (pending.status === "prepared" || pending.status === "sending") {
    return setGuestPendingTurnStatus(pending, "uncertain");
  }
  return pending;
}

export function clearGuestPendingTurn(turn: GuestPendingTurn): void {
  if (typeof window === "undefined") return;
  const current = getGuestPendingTurn(turn.hotelId, turn.conversationId);
  if (current?.messageId === turn.messageId) {
    sessionStorage.removeItem(pendingTurnKey(turn.hotelId, turn.conversationId));
    clearPendingTurnLocator(turn);
  }
}

export function confirmGuestPendingTurn(turn: GuestPendingTurn): void {
  const confirmed = setGuestPendingTurnStatus(turn, "confirmed");
  sessionStorage.removeItem(pendingTurnKey(confirmed.hotelId, confirmed.conversationId));
  clearPendingTurnLocator(confirmed);
}

export function getGuestConversationBundleStatus(hotelId: string): GuestConversationBundleStatus {
  if (typeof window === "undefined") return "missing";
  const raw = sessionStorage.getItem(getScopedSessionKey(GUEST_CONVERSATION_BUNDLE_KEY));
  if (!raw) return "missing";
  try {
    const parsed = JSON.parse(raw) as Partial<GuestConversationSessionBundle>;
    if (
      parsed.version !== 1 || parsed.hotelId !== hotelId ||
      typeof parsed.conversationId !== "string" || !parsed.conversationId ||
      typeof parsed.capability !== "string" || !parsed.capability ||
      typeof parsed.expiresAt !== "string"
    ) return "invalid";
    const expiresAt = Date.parse(parsed.expiresAt);
    if (!Number.isFinite(expiresAt)) return "invalid";
    return expiresAt <= Date.now() ? "expired" : "valid";
  } catch {
    return "invalid";
  }
}

export function getGuestConversationBundle(hotelId: string): GuestConversationSessionBundle | null {
  if (typeof window === "undefined") return null;
  const key = getScopedSessionKey(GUEST_CONVERSATION_BUNDLE_KEY);
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key) || "null") as Partial<GuestConversationSessionBundle> | null;
    if (
      !parsed || parsed.version !== 1 || parsed.hotelId !== hotelId ||
      typeof parsed.conversationId !== "string" || !parsed.conversationId ||
      typeof parsed.capability !== "string" || !parsed.capability ||
      typeof parsed.expiresAt !== "string" || !Number.isFinite(Date.parse(parsed.expiresAt)) ||
      Date.parse(parsed.expiresAt) <= Date.now()
    ) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed as GuestConversationSessionBundle;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

export function setGuestConversationBundle(bundle: GuestConversationSessionBundle): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(getScopedSessionKey(GUEST_CONVERSATION_BUNDLE_KEY), JSON.stringify(bundle));
}

export function clearGuestConversationBundle(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(getScopedSessionKey(GUEST_CONVERSATION_BUNDLE_KEY));
}

export function clearConversationSession() {
  if (typeof window === "undefined") return;
  clearGuestConversationBundle();
  sessionStorage.removeItem(getScopedSessionKey(CONVERSATION_ID_STORAGE_KEY));
  sessionStorage.removeItem(CONVERSATION_ID_STORAGE_KEY);
}

export function getConversationId(): string | null {
  if (typeof window === "undefined") return null;
  const sessionValue = sessionStorage.getItem(getScopedSessionKey(CONVERSATION_ID_STORAGE_KEY));
  if (sessionValue !== null) {
    const v = String(sessionValue).trim();
    if (v && v !== "undefined" && v !== "null") return v;
  }
  return null;
}
export function hasConversationId(): boolean {
  if (typeof window === "undefined") return false;
  const sessionValue = sessionStorage.getItem(getScopedSessionKey(CONVERSATION_ID_STORAGE_KEY));
  return sessionValue !== null;
}

export function setConversationId(id: string) {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(getScopedSessionKey(CONVERSATION_ID_STORAGE_KEY), id);
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
    clearConversationSession();
    sessionStorage.removeItem(getScopedSessionKey(GUEST_ID_STORAGE_KEY));
    sessionStorage.removeItem(GUEST_ID_STORAGE_KEY);
    localStorage.removeItem("lang");
    document.cookie = "lang=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  } catch {}
}
