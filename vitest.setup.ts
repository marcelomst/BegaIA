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

// Silenciar/aislar capas externas durante tests
if (typeof process !== "undefined") {
  // Evita llamadas a modelos estructurados (OpenAI) en pruebas
  process.env.STRUCTURED_ENABLED = "false";
}

// --- Mini mejoras de test ergonomics ---
// 1. Filtrar ruido de warnings de OPENAI_API_KEY ausente (dejamos fallback determinista igual)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (args.some(a => typeof a === 'string' && a.includes('OPENAI_API_KEY environment variable is missing'))) {
    // swallow
    return;
  }
  originalConsoleError(...args);
};

// 2. Evitar warning de console.timeLog label inexistente ('fillSlotsWithLLM')
const startedTimers = new Set<string>();
const origTime = console.time.bind(console);
const origTimeLog = console.timeLog.bind(console) as any;
console.time = (label: string = 'default') => {
  startedTimers.add(label);
  try { origTime(label); } catch { /* ignore in test */ }
};
console.timeLog = (label: string = 'default', ...rest: any[]) => {
  if (!startedTimers.has(label) && label === 'fillSlotsWithLLM') {
    return; // swallow noisy warning
  }
  try { origTimeLog(label, ...rest); } catch { /* ignore */ }
};

