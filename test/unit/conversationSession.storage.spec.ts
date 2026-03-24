import { describe, expect, it, beforeEach } from "vitest";

import { getConversationId, hasConversationId, resetConversationSession, setConversationId } from "@/utils/conversationSession";
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

  it("usa sessionStorage para guestId y evita compartirlo por localStorage", () => {
    localStorage.setItem("guestId", "guest-shared-legacy");

    const guestId = getOrCreateGuestId();

    expect(guestId).toMatch(/^guest-/);
    expect(guestId).not.toBe("guest-shared-legacy");
    expect(sessionStorage.getItem(getScopedSessionKey("guestId"))).toBe(guestId);
    expect(localStorage.getItem("guestId")).toBe("guest-shared-legacy");
  });

  it("reset limpia conversationId y guestId de sessionStorage", () => {
    setConversationId("conv-tab-2");
    void getOrCreateGuestId();

    resetConversationSession();

    expect(sessionStorage.getItem(getScopedSessionKey("conversationId"))).toBeNull();
    expect(sessionStorage.getItem(getScopedSessionKey("guestId"))).toBeNull();
  });

  it("aísla conversationId y guestId por tab scope aunque compartan el mismo sessionStorage subyacente", () => {
    (globalThis as NamedGlobal).name = "begasist:web-tab:tab-1";
    setConversationId("conv-tab-1");
    const guestOne = getOrCreateGuestId();

    (globalThis as NamedGlobal).name = "begasist:web-tab:tab-2";
    expect(getConversationId()).toBeNull();
    const guestTwo = getOrCreateGuestId();

    expect(guestTwo).toMatch(/^guest-/);
    expect(guestTwo).not.toBe(guestOne);
    expect(sessionStorage.getItem("conversationId:tab-1")).toBe("conv-tab-1");
    expect(sessionStorage.getItem("conversationId:tab-2")).toBeNull();
  });
});
