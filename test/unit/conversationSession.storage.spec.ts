import { describe, expect, it, beforeEach } from "vitest";

import { getConversationId, hasConversationId, resetConversationSession, setConversationId } from "@/utils/conversationSession";
import { getOrCreateGuestId } from "@/utils/guestSession";

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
    expect(sessionStorage.getItem("conversationId")).toBe("conv-tab-1");
    expect(localStorage.getItem("conversationId")).toBe("conv-shared-legacy");
  });

  it("usa sessionStorage para guestId y evita compartirlo por localStorage", () => {
    localStorage.setItem("guestId", "guest-shared-legacy");

    const guestId = getOrCreateGuestId();

    expect(guestId).toMatch(/^guest-/);
    expect(guestId).not.toBe("guest-shared-legacy");
    expect(sessionStorage.getItem("guestId")).toBe(guestId);
    expect(localStorage.getItem("guestId")).toBe("guest-shared-legacy");
  });

  it("reset limpia conversationId y guestId de sessionStorage", () => {
    setConversationId("conv-tab-2");
    void getOrCreateGuestId();

    resetConversationSession();

    expect(sessionStorage.getItem("conversationId")).toBeNull();
    expect(sessionStorage.getItem("guestId")).toBeNull();
  });
});
