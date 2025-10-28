import { vi } from "vitest";

// Polyfill scrollIntoView for jsdom
if (typeof (globalThis as any).Element !== "undefined") {
    const proto = (globalThis as any).Element.prototype as any;
    if (typeof proto.scrollIntoView !== "function") {
        proto.scrollIntoView = vi.fn();
    }
}

// Basic localStorage polyfill if missing
if (!(globalThis as any).localStorage) {
    const store: Record<string, string> = {};
    (globalThis as any).localStorage = {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => { store[k] = String(v); },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => { for (const k in store) delete store[k]; },
        key: (i: number) => Object.keys(store)[i] ?? null,
        length: 0,
    } as any;
}

// matchMedia stub for components that might use it
if (!(globalThis as any).matchMedia) {
    (globalThis as any).matchMedia = () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    });
}
