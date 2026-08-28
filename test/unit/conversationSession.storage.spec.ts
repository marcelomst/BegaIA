import { describe, expect, it, beforeEach } from "vitest";

import { clearConversationSession, getConversationId, hasConversationId, resetConversationSession, setConversationId } from "@/utils/conversationSession";
import { getOrCreateGuestId } from "@/utils/guestSession";
import { getScopedSessionKey } from "@/utils/webTabScope";

type NamedGlobal = typeof globalThis & { name: string };

function makeStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => { store.set(key, String(value)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

describe("widget session storage isolation", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", { value: makeStorage(), configurable: true });
    Object.defineProperty(globalThis, "localStorage", { value: makeStorage(), configurable: true });
    Object.defineProperty(globalThis, "document", { value: { cookie: "" }, configurable: true });
    Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
    Object.defineProperty(globalThis, "name", { value: "", writable: true, configurable: true });
    sessionStorage.clear();
    localStorage.clear();
    document.cookie = "conversationId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "lang=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  });

  it("usa sessionStorage para conversationId y no reutiliza localStorage legado", () => {
    localStorage.setItem("conversationId", "conv-shared-legacy");

    expect(getConversationId()).toBeNull();
    expect(hasConversationId()).toBe(false);

    setConversationId("conv-tab-1");

    expect(getConversationId()).toBe("conv-tab-1");
    expect(sessionStorage.getItem(getScopedSessionKey("conversationId"))).toBe("conv-tab-1");
    expect(localStorage.getItem("conversationId")).toBe("conv-shared-legacy");
  });

  it("persiste guestId por hotel en localStorage y no usa el legacy global", () => {
    localStorage.setItem("guestId", "guest-shared-legacy");

    const guestId = getOrCreateGuestId("hotel999");

    expect(guestId).toMatch(/^guest-/);
    expect(guestId).not.toBe("guest-shared-legacy");
    expect(localStorage.getItem("begai:guestId:hotel999")).toBe(guestId);
    expect(localStorage.getItem("guestId")).toBe("guest-shared-legacy");
  });

  it("reutiliza guestId persistente entre tabs y sesiones de navegador", () => {
    localStorage.setItem("begai:guestId:hotel999", "guest-persisted");
    (globalThis as NamedGlobal).name = "begasist:web-tab:tab-2";

    expect(getOrCreateGuestId("hotel999")).toBe("guest-persisted");

    Object.defineProperty(globalThis, "sessionStorage", { value: makeStorage(), configurable: true });
    (globalThis as NamedGlobal).name = "";
    expect(getOrCreateGuestId("hotel999")).toBe("guest-persisted");
  });

  it("mantiene identidades separadas entre hoteles", () => {
    const hotel999Guest = getOrCreateGuestId("hotel999");
    const hotel123Guest = getOrCreateGuestId("hotel123");

    expect(hotel123Guest).not.toBe(hotel999Guest);
    expect(localStorage.getItem("begai:guestId:hotel999")).toBe(hotel999Guest);
    expect(localStorage.getItem("begai:guestId:hotel123")).toBe(hotel123Guest);
  });

  it("migra el guestId valido de la sesion actual sin generar otro", () => {
    sessionStorage.setItem(getScopedSessionKey("guestId"), "guest-session-existing");

    expect(getOrCreateGuestId("hotel999")).toBe("guest-session-existing");
    expect(localStorage.getItem("begai:guestId:hotel999")).toBe("guest-session-existing");
  });

  it.each(["", "undefined", "null", "web-guest"])("no acepta guestId invalido: %s", (invalid) => {
    localStorage.setItem("begai:guestId:hotel999", invalid);

    expect(getOrCreateGuestId("hotel999")).toMatch(/^guest-/);
  });

  it("migra la clave tenant-aware legacy cuando existe", () => {
    localStorage.setItem("begasist:guestId:hotel999", "guest-legacy");

    expect(getOrCreateGuestId("hotel999")).toBe("guest-legacy");
    expect(localStorage.getItem("begai:guestId:hotel999")).toBe("guest-legacy");
  });

  it("reset limpia conversationId y guestId de sessionStorage", () => {
    setConversationId("conv-tab-2");
    void getOrCreateGuestId("hotel999");

    resetConversationSession();

    expect(sessionStorage.getItem(getScopedSessionKey("conversationId"))).toBeNull();
    expect(sessionStorage.getItem(getScopedSessionKey("guestId"))).toBeNull();
  });

  it("aísla conversationId y guestId por tab scope aunque compartan el mismo sessionStorage subyacente", () => {
    (globalThis as NamedGlobal).name = "begasist:web-tab:tab-1";
    setConversationId("conv-tab-1");
    const guestOne = getOrCreateGuestId("hotel999");

    (globalThis as NamedGlobal).name = "begasist:web-tab:tab-2";
    expect(getConversationId()).toBeNull();
    const guestTwo = getOrCreateGuestId("hotel999");

    expect(guestTwo).toBe(guestOne);
    expect(sessionStorage.getItem("conversationId:tab-1")).toBe("conv-tab-1");
    expect(sessionStorage.getItem("conversationId:tab-2")).toBeNull();
  });

  it("nueva conversacion limpia solo conversationId y conserva guestId", () => {
    setConversationId("conv-tab-1");
    const guestId = getOrCreateGuestId("hotel999");

    clearConversationSession();

    expect(getConversationId()).toBeNull();
    expect(getOrCreateGuestId("hotel999")).toBe(guestId);
  });
});
