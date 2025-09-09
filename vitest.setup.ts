// Path: /test/setup.ts
import { afterEach, vi } from "vitest";

// Node >=18 ya trae fetch, pero aseguramos globals útiles:
if (!(global as any).crypto?.randomUUID) {
  (global as any).crypto = {
    ...((global as any).crypto || {}),
    randomUUID: () =>
      "uuid-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
  };
}

if (!(global as any).Headers) {
  (global as any).Headers = globalThis.Headers;
}
if (!(global as any).Request) {
  (global as any).Request = globalThis.Request;
}
if (!(global as any).Response) {
  (global as any).Response = globalThis.Response;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});
