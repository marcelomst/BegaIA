// Path: /root/begasist/test/setup.ts
import { beforeAll, afterAll, afterEach, vi } from "vitest";

// ✅ setea envs sin escribir propiedades readonly
beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("VITEST", "1");
  if (!process.env.TZ) vi.stubEnv("TZ", "UTC");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

// ===== Polyfills mínimos =====
if (!(globalThis as any).crypto?.randomUUID) {
  (globalThis as any).crypto = {
    ...((globalThis as any).crypto || {}),
    randomUUID: () =>
      "uuid-" + Math.random().toString(36).slice(2) + Date.now().toString(36),
  };
}

if (!(globalThis as any).Headers) (globalThis as any).Headers = (globalThis as any).Headers || (globalThis as any).undici?.Headers;
if (!(globalThis as any).Request) (globalThis as any).Request = (globalThis as any).Request || (globalThis as any).undici?.Request;
if (!(globalThis as any).Response) (globalThis as any).Response = (globalThis as any).Response || (globalThis as any).undici?.Response;

// ======= Mocks =======
vi.mock("@/lib/db/messages", async () => await import("./mocks/db_messages"));
vi.mock("/root/begasist/lib/db/messages", async () => await import("./mocks/db_messages"));
vi.mock("@/lib/db_messages", async () => await import("./mocks/db_messages"));
vi.mock("/root/begasist/lib/db_messages", async () => await import("./mocks/db_messages"));

vi.mock("@/lib/db/conversations", async () => await import("./mocks/db_conversations"));
vi.mock("/root/begasist/lib/db/conversations", async () => await import("./mocks/db_conversations"));
vi.mock("@/lib/db_conversations", async () => await import("./mocks/db_conversations"));
vi.mock("/root/begasist/lib/db_conversations", async () => await import("./mocks/db_conversations"));

vi.mock("@/lib/services/messages", async () => await import("./mocks/services_messages"));
vi.mock("/root/begasist/lib/services/messages", async () => await import("./mocks/services_messages"));
vi.mock("@/lib/auth/getCurrentUser", () => {
  return {
    getCurrentUser: vi.fn(async () => ({
      userId: "u-test",
      email: "test@example.com",
      hotelId: "hotel999",
      roles: ["admin"],
    })),
  };
});

const defaultConfig = {
  hotelId: "hotel999",
  defaultLanguage: "es",
  channelConfigs: {
    web: { mode: "automatic", enabled: true },
    email: { mode: "automatic", enabled: true },
    whatsapp: { mode: "automatic", enabled: true },
  },
};
vi.mock("@/lib/config/hotelConfig.server", () => {
  const fn = vi.fn(async (_hotelId: string) => defaultConfig);
  return { getHotelConfig: fn };
});
vi.mock("/root/begasist/lib/config/hotelConfig.server", () => {
  const fn = vi.fn(async (_hotelId: string) => defaultConfig);
  return { getHotelConfig: fn };
});

// Astra/Redis
vi.mock("@/lib/astra/connection", async () => {
  const m = await import("./mocks/astra");
  return {
    getAstraDB: () => ({ collection: (name: string) => m.getCollection(name) }),
    getHotelAstraCollection: (hotelId: string, suffix = "_collection") =>
      m.getCollection(`${hotelId}${suffix}`),
    getHotelConfigCollection: () => m.getCollection("hotel_config"),
  };
});
vi.mock("/root/begasist/lib/astra/connection", async () => {
  const m = await import("./mocks/astra");
  return {
    getAstraDB: () => ({ collection: (name: string) => m.getCollection(name) }),
    getHotelAstraCollection: (hotelId: string, suffix = "_collection") =>
      m.getCollection(`${hotelId}${suffix}`),
    getHotelConfigCollection: () => m.getCollection("hotel_config"),
  };
});

// DB: messages
vi.mock("@/lib/db/messages", async () => await import("./mocks/db_messages"));
vi.mock("/root/begasist/lib/db/messages", async () => await import("./mocks/db_messages"));

// Services usados por /api/messages/by-conversation
vi.mock("@/lib/services/messages", async () => await import("./mocks/services_messages"));
vi.mock("/root/begasist/lib/services/messages", async () => await import("./mocks/services_messages"));


vi.mock("@/lib/redis", async () => await import("./mocks/redis"));
vi.mock("/root/begasist/lib/redis", async () => await import("./mocks/redis"));

// Mock del generador de instrucciones de sistema (evita tocar Astra)
vi.mock("@/lib/agents/systemInstructions", () => {
  return {
    buildSystemInstruction: vi.fn(async () => "You are a helpful assistant."),
    choosePlaybookKey: vi.fn(() => "default"),
  };
});
vi.mock("/root/begasist/lib/agents/systemInstructions", () => {
  return {
    buildSystemInstruction: vi.fn(async () => "You are a helpful assistant."),
    choosePlaybookKey: vi.fn(() => "default"),
  };
});


afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});
