// Path: test/integration/guest_web_conversation_capability.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getCollection } from "../mocks/astra";

const pipelineMocks = vi.hoisted(() => ({
  handleChannelMessage: vi.fn(),
  resolveGuestIdentity: vi.fn(),
}));

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  ChannelMessageInputError: class ChannelMessageInputError extends Error {},
  handleChannelMessage: pipelineMocks.handleChannelMessage,
}));

vi.mock("@/lib/pipeline/resolveGuestIdentity", () => ({
  resolveGuestIdentity: pipelineMocks.resolveGuestIdentity,
}));

vi.mock("@/lib/security/guestBootstrapRateLimit", () => ({
  GuestBootstrapRateLimitError: class GuestBootstrapRateLimitError extends Error {},
  enforceGuestBootstrapRateLimit: vi.fn(async () => undefined),
}));

vi.mock("@/lib/services/messages", () => ({
  getMessagesByConversationService: vi.fn(async (hotelId: string, channel: string, conversationId: string) => {
    const messages = await getCollection("messages").findMany({ hotelId, channel, conversationId });
    return messages.sort((a, b) => Date.parse(a.timestamp || "") - Date.parse(b.timestamp || ""));
  }),
}));

import { POST as bootstrapPOST } from "@/app/api/guest/web/bootstrap/route";
import { GET as historyGET } from "@/app/api/guest/web/history/route";
import { POST as chatPOST } from "@/app/api/chat/route";
import {
  createGuestWebGrant,
  issueGuestConversationCapability,
  revokeGuestConversationGrant,
} from "@/lib/auth/guestConversationCapability";
import { createConversation, getConversationById, updateConversation } from "@/lib/db/conversations";
import { middleware } from "@/middleware";

const HOTEL_ID = "hotel999";
const SECRET = "guest-test-secret-with-at-least-32-bytes-1234567890";

type Bundle = {
  capability: string;
  conversationId: string;
  hotelId: string;
  expiresAt: string;
};

function request(path: string, init: RequestInit = {}) {
  return new Request(`http://localhost${path}`, init);
}

async function bootstrap(): Promise<Bundle> {
  const response = await bootstrapPOST(request("/api/guest/web/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify({ hotelId: HOTEL_ID, lang: "es" }),
  }));
  expect(response.status).toBe(201);
  return await response.json() as Bundle;
}

function authHeaders(capability: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${capability}`,
  };
}

async function chat(bundle: Bundle, query: string, overrides: Record<string, unknown> = {}) {
  return chatPOST(request("/api/chat", {
    method: "POST",
    headers: authHeaders(bundle.capability),
    body: JSON.stringify({
      query,
      messageId: crypto.randomUUID(),
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
      channel: "web",
      ...overrides,
    }),
  }));
}

async function capabilityFixture(input: {
  grantJti?: string;
  tokenJti?: string;
  now?: Date;
  scopes?: Array<"conversation:read" | "conversation:write">;
  revokedAt?: string | null;
  persistGrant?: boolean;
} = {}) {
  const conversationId = `conv-fixture-${crypto.randomUUID()}`;
  const webSubject = `ws_${crypto.randomUUID()}`;
  const grantJti = input.grantJti ?? crypto.randomUUID();
  const tokenJti = input.tokenJti ?? grantJti;
  const grant = createGuestWebGrant({ webSubject, jti: grantJti, now: input.now });
  if (input.scopes) grant.scopes = input.scopes;
  if (input.revokedAt !== undefined) grant.revokedAt = input.revokedAt;
  const token = await issueGuestConversationCapability({
    hotelId: HOTEL_ID,
    conversationId,
    jti: tokenJti,
    grant,
  });
  await createConversation({
    hotelId: HOTEL_ID,
    conversationId,
    channel: "web",
    lang: "es",
    guestId: `guest-${webSubject}`,
    metadata: input.persistGrant === false ? {} : { guestWebGrant: grant },
  });
  return { token, conversationId, grant };
}

describe("Guest Web conversation capability", () => {
  beforeEach(() => {
    vi.stubEnv("GUEST_WEB_CONVERSATION_SECRET", SECRET);
    pipelineMocks.resolveGuestIdentity.mockReset();
    pipelineMocks.resolveGuestIdentity.mockImplementation(async ({ rawGuestId }: { rawGuestId: string }) => ({
      guestId: `guest-${rawGuestId}`,
      guestAlias: `web:${rawGuestId}`,
    }));
    pipelineMocks.handleChannelMessage.mockReset();
    pipelineMocks.handleChannelMessage.mockImplementation(async (input: {
      query: string;
      hotelId: string;
      channel: string;
      conversationId: string;
      guestId: string;
      sourceMsgId: string;
    }) => {
      const messages = getCollection("messages");
      const turn = (await messages.findMany({
        hotelId: input.hotelId,
        channel: input.channel,
        conversationId: input.conversationId,
        role: "user",
      })).length + 1;
      const timestamp = new Date(Date.now() + turn * 1000).toISOString();
      await messages.insertOne({
        messageId: `user-${crypto.randomUUID()}`,
        hotelId: input.hotelId,
        channel: input.channel,
        conversationId: input.conversationId,
        guestId: `guest-${input.guestId}`,
        sender: "guest",
        role: "user",
        direction: "in",
        sourceMsgId: input.sourceMsgId,
        content: input.query,
        status: "sent",
        timestamp,
      });
      const persistedUsers = (await messages.findMany({
        hotelId: input.hotelId,
        channel: input.channel,
        conversationId: input.conversationId,
        role: "user",
      })).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
      const firstTurn = persistedUsers[0]?.content;
      const response = turn === 4 ? `Contexto preservado del primer turno: ${firstTurn}` : `Respuesta ${turn}`;
      const messageId = `assistant-${crypto.randomUUID()}`;
      await messages.insertOne({
        messageId,
        hotelId: input.hotelId,
        channel: input.channel,
        conversationId: input.conversationId,
        sender: "assistant",
        role: "ai",
        direction: "out",
        content: response,
        status: "sent",
        timestamp: new Date(Date.parse(timestamp) + 1).toISOString(),
      });
      return {
        response,
        status: "sent",
        messageId,
        conversationId: input.conversationId,
        lang: "es",
        hotelId: input.hotelId,
        channel: input.channel,
      };
    });
  });

  it("persists one authorized binding across four turns and reloads its history", async () => {
    const bundle = await bootstrap();
    const queries = ["Mi nombre es Ada", "Necesito una habitación", "Para dos personas", "¿Cómo me llamo?"];
    const responses = [];
    for (const query of queries) {
      const response = await chat(bundle, query);
      expect(response.status).toBe(200);
      responses.push(await response.json());
    }
    expect(new Set(responses.map((value) => value.conversationId))).toEqual(new Set([bundle.conversationId]));
    expect(responses[3].response).toContain("Mi nombre es Ada");

    const history = await historyGET(request("/api/guest/web/history", {
      headers: { Authorization: `Bearer ${bundle.capability}` },
    }));
    expect(history.status).toBe(200);
    const payload = await history.json();
    expect(payload.conversationId).toBe(bundle.conversationId);
    expect(payload.messages).toHaveLength(8);
    expect(payload.messages[0]).toMatchObject({ role: "user", content: "Mi nombre es Ada" });
    expect(payload.messages[7]).toMatchObject({ role: "assistant" });
    expect(payload.messages[7].content).toContain("Mi nombre es Ada");
  });

  it("confirms a normal ownership unset and blocks an equivalent recorded retry", async () => {
    const bundle = await bootstrap();
    const messageId = `client-${crypto.randomUUID()}`;

    expect((await chat(bundle, "turno durable", { messageId })).status).toBe(200);
    const repeated = await chat(bundle, "turno durable", { messageId });
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({
      code: "guest_turn_already_recorded",
      retry: "do_not_retry",
    });
    expect(pipelineMocks.handleChannelMessage).toHaveBeenCalledTimes(1);
  });

  it("serializes concurrent requests with the same client messageId without duplicate effects", async () => {
    const bundle = await bootstrap();
    const messageId = `client-${crypto.randomUUID()}`;
    const defaultPipeline = pipelineMocks.handleChannelMessage.getMockImplementation()!;
    let markStarted!: () => void;
    let allowFinish!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const finish = new Promise<void>((resolve) => { allowFinish = resolve; });
    pipelineMocks.handleChannelMessage.mockImplementationOnce(async (input) => {
      markStarted();
      await finish;
      return defaultPipeline(input);
    });

    const first = chat(bundle, "turno concurrente", { messageId });
    await started;
    const concurrent = await chat(bundle, "turno concurrente", { messageId });
    expect(concurrent.status).toBe(409);
    expect(await concurrent.json()).toMatchObject({ code: "guest_conversation_busy" });
    allowFinish();
    expect((await first).status).toBe(200);
    expect(pipelineMocks.handleChannelMessage).toHaveBeenCalledTimes(1);
    expect(await getCollection("messages").count({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
    })).toBe(2);
  });

  it("preserves a completed turn when unset succeeds but release readback is uncertain", async () => {
    const bundle = await bootstrap();
    const messageId = `client-${crypto.randomUUID()}`;
    const convState = getCollection("conv_state");
    const originalUpdate = convState.updateOne.bind(convState);
    const originalFind = convState.findOne.bind(convState);
    let failReleaseReadback = false;
    vi.spyOn(convState, "updateOne").mockImplementation(async (filter, update, options) => {
      const result = await originalUpdate(filter, update, options);
      if ((update as any)?.$unset?.conversationWriterGuard) failReleaseReadback = true;
      return result;
    });
    vi.spyOn(convState, "findOne").mockImplementation(async (filter) => {
      if (failReleaseReadback) {
        failReleaseReadback = false;
        const error: any = new Error("release readback timeout");
        error.code = "ETIMEDOUT";
        throw error;
      }
      return originalFind(filter);
    });

    const response = await chat(bundle, "efecto persistido", { messageId });
    expect(response.status).toBe(202);
    const uncertainPayload = await response.json();
    expect(uncertainPayload).toMatchObject({
      code: "guest_turn_completed_reconciliation_required",
      outcome: "completed_reconciliation_required",
      retry: "do_not_retry",
      reconciliationRequired: true,
      messageId,
    });
    expect(uncertainPayload).not.toHaveProperty("response");
    expect(uncertainPayload).not.toHaveProperty("rich");
    const effects = await getCollection("messages").count({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
    });
    expect(effects).toBe(2);

    const repeated = await chat(bundle, "efecto persistido", { messageId });
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({ code: "guest_turn_already_recorded" });
    expect(pipelineMocks.handleChannelMessage).toHaveBeenCalledTimes(1);
    expect(await getCollection("messages").count({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
    })).toBe(effects);
  });

  it.each([
    ["unset not applied", false],
    ["timeout before unset", true],
  ] as const)("keeps the completed result non-retryable when release has %s", async (_label, throws) => {
    const bundle = await bootstrap();
    const messageId = `client-${crypto.randomUUID()}`;
    const convState = getCollection("conv_state");
    const originalUpdate = convState.updateOne.bind(convState);
    vi.spyOn(convState, "updateOne").mockImplementation(async (filter, update, options) => {
      if ((update as any)?.$unset?.conversationWriterGuard) {
        if (throws) {
          const error: any = new Error("timeout before ownership unset");
          error.code = "ETIMEDOUT";
          throw error;
        }
        return { acknowledged: true, matchedCount: 0, modifiedCount: 0 } as any;
      }
      return originalUpdate(filter, update, options);
    });

    const response = await chat(bundle, "efecto con ownership retenido", { messageId });
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ retry: "do_not_retry" });
    const effects = await getCollection("messages").count({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
    });
    expect(effects).toBe(2);
    const repeated = await chat(bundle, "efecto con ownership retenido", { messageId });
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({ code: "guest_conversation_busy" });
    expect(pipelineMocks.handleChannelMessage).toHaveBeenCalledTimes(1);
  });

  it("treats a timeout after the unset as released when durable readback confirms it", async () => {
    const bundle = await bootstrap();
    const messageId = `client-${crypto.randomUUID()}`;
    const convState = getCollection("conv_state");
    const originalUpdate = convState.updateOne.bind(convState);
    vi.spyOn(convState, "updateOne").mockImplementation(async (filter, update, options) => {
      const result = await originalUpdate(filter, update, options);
      if ((update as any)?.$unset?.conversationWriterGuard) {
        const error: any = new Error("timeout after ownership unset");
        error.code = "ETIMEDOUT";
        throw error;
      }
      return result;
    });

    expect((await chat(bundle, "unset confirmado por readback", { messageId })).status).toBe(200);
    const repeated = await chat(bundle, "unset confirmado por readback", { messageId });
    expect(repeated.status).toBe(409);
    expect(await repeated.json()).toMatchObject({ code: "guest_turn_already_recorded" });
    expect(pipelineMocks.handleChannelMessage).toHaveBeenCalledTimes(1);
  });

  it("keeps two bootstrapped conversations isolated", async () => {
    const [first, second] = await Promise.all([bootstrap(), bootstrap()]);
    expect(first.conversationId).not.toBe(second.conversationId);
    await chat(first, "solo A");
    await chat(second, "solo B");
    const [historyA, historyB] = await Promise.all([
      historyGET(request("/api/guest/web/history", { headers: { Authorization: `Bearer ${first.capability}` } })),
      historyGET(request("/api/guest/web/history", { headers: { Authorization: `Bearer ${second.capability}` } })),
    ]);
    expect(JSON.stringify(await historyA.json())).toContain("solo A");
    expect(JSON.stringify(await historyB.json())).toContain("solo B");
  });

  it("orders an in-flight turn before a confirmed revocation and never reactivates the grant", async () => {
    const bundle = await bootstrap();
    const persisted = await getConversationById(bundle.hotelId, bundle.conversationId);
    const expectedJtiHash = persisted?.metadata?.guestWebGrant?.jtiHash;
    expect(expectedJtiHash).toMatch(/^[a-f0-9]{64}$/);

    let markTurnStarted!: () => void;
    let allowTurnToFinish!: () => void;
    const turnStarted = new Promise<void>((resolve) => { markTurnStarted = resolve; });
    const finishTurn = new Promise<void>((resolve) => { allowTurnToFinish = resolve; });
    const stages: string[] = [];
    pipelineMocks.handleChannelMessage.mockImplementationOnce(async (input: {
      query: string;
      hotelId: string;
      channel: string;
      conversationId: string;
    }) => {
      stages.push("turn_started");
      markTurnStarted();
      await finishTurn;
      await getCollection("messages").insertOne({
        messageId: `race-effect-${crypto.randomUUID()}`,
        hotelId: input.hotelId,
        channel: input.channel,
        conversationId: input.conversationId,
        role: "user",
        content: input.query,
        status: "sent",
        timestamp: new Date().toISOString(),
      });
      stages.push("turn_effect_persisted");
      return {
        response: "turn completed before revocation",
        status: "sent",
        messageId: `assistant-${crypto.randomUUID()}`,
        conversationId: input.conversationId,
        lang: "es",
        hotelId: input.hotelId,
        channel: input.channel,
      };
    });

    const inFlightTurn = chat(bundle, "turno ya iniciado");
    await turnStarted;
    stages.push("revocation_requested");
    await expect(revokeGuestConversationGrant({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
      expectedJtiHash: expectedJtiHash!,
    })).rejects.toMatchObject({ code: "guest_conversation_busy", status: 409 });

    allowTurnToFinish();
    expect((await inFlightTurn).status).toBe(200);
    const recognized = await revokeGuestConversationGrant({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
      expectedJtiHash: expectedJtiHash!,
    });
    stages.push("revocation_recognized");
    expect(recognized).toMatchObject({ status: "revoked", idempotent: false });
    expect(stages).toEqual([
      "turn_started",
      "revocation_requested",
      "turn_effect_persisted",
      "revocation_recognized",
    ]);

    const effectsAtRecognition = await getCollection("messages").count({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
    });
    expect((await chat(bundle, "turno posterior bloqueado")).status).toBe(401);
    expect(await getCollection("messages").count({
      hotelId: bundle.hotelId,
      conversationId: bundle.conversationId,
    })).toBe(effectsAtRecognition);

    await expect(updateConversation(bundle.hotelId, bundle.conversationId, {
      metadata: {
        guestWebGrant: { ...persisted!.metadata!.guestWebGrant!, revokedAt: null },
      },
    })).rejects.toThrow(/security-managed/);
    expect((await getConversationById(bundle.hotelId, bundle.conversationId))?.metadata?.guestWebGrant?.revokedAt)
      .toBe(recognized.revokedAt);
  });

  it("rejects missing, tampered, cross-conversation and cross-hotel authority", async () => {
    const bundle = await bootstrap();
    const missing = await chatPOST(request("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "claim",
        hotelId: bundle.hotelId,
        conversationId: bundle.conversationId,
        guestId: "claimed",
      }),
    }));
    expect(missing.status).toBe(401);

    const [header, payload, signature] = bundle.capability.split(".");
    const payloadIndex = Math.floor(payload.length / 2);
    const tamperedPayload = `${payload.slice(0, payloadIndex)}${payload[payloadIndex] === "a" ? "b" : "a"}${payload.slice(payloadIndex + 1)}`;
    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
    const tampered = await chatPOST(request("/api/chat", {
      method: "POST",
      headers: authHeaders(tamperedToken),
      body: JSON.stringify({ query: "claim", hotelId: bundle.hotelId }),
    }));
    expect(tampered.status).toBe(401);
    expect((await chat(bundle, "claim", { conversationId: "conv-other" })).status).toBe(403);
    expect((await chat(bundle, "claim", { hotelId: "hotel-other" })).status).toBe(403);
  });

  it("rejects expired, revoked, missing-grant, jti-mismatch and insufficient-scope capabilities", async () => {
    const expired = await capabilityFixture({ now: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) });
    const revoked = await capabilityFixture({ revokedAt: new Date().toISOString() });
    const missingGrant = await capabilityFixture({ persistGrant: false });
    const jtiMismatch = await capabilityFixture({ tokenJti: crypto.randomUUID() });
    const readOnly = await capabilityFixture({ scopes: ["conversation:read"] });

    for (const fixture of [expired, revoked, missingGrant, jtiMismatch]) {
      const response = await chatPOST(request("/api/chat", {
        method: "POST",
        headers: authHeaders(fixture.token),
        body: JSON.stringify({ query: "blocked", hotelId: HOTEL_ID, conversationId: fixture.conversationId }),
      }));
      expect(response.status).toBe(401);
    }
    const scoped = await chatPOST(request("/api/chat", {
      method: "POST",
      headers: authHeaders(readOnly.token),
      body: JSON.stringify({ query: "blocked", hotelId: HOTEL_ID, conversationId: readOnly.conversationId }),
    }));
    expect(scoped.status).toBe(403);
  });

  it.each(["", "short-secret", "                                "])(
    "fails closed before creating state when the Guest secret is absent or insufficient: %j",
    async (secret) => {
    vi.stubEnv("GUEST_WEB_CONVERSATION_SECRET", secret);
    const before = await getCollection("conversations").count({ hotelId: HOTEL_ID });
    const response = await bootstrapPOST(request("/api/guest/web/bootstrap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hotelId: HOTEL_ID }),
    }));
    expect(response.status).toBe(503);
    expect(await getCollection("conversations").count({ hotelId: HOTEL_ID })).toBe(before);
  });

  it("history omits system data and pending supervised suggestions", async () => {
    const bundle = await bootstrap();
    const messages = getCollection("messages");
    await messages.insertOne({
      messageId: `system-${crypto.randomUUID()}`,
      hotelId: HOTEL_ID,
      conversationId: bundle.conversationId,
      channel: "web",
      role: "system",
      content: "internal prompt and ownership trace",
      audit: { secret: true },
      timestamp: new Date().toISOString(),
    });
    await messages.insertOne({
      messageId: `visible-${crypto.randomUUID()}`,
      hotelId: HOTEL_ID,
      conversationId: bundle.conversationId,
      channel: "web",
      role: "ai",
      sender: "assistant",
      status: "sent",
      suggestion: "unapproved fallback must stay internal",
      content: "safe guest-visible response",
      rich: {
        carousel: [{
          title: "Visible place",
          internalAuthorization: "must-not-leak",
          images: [{ url: "https://example.test/place.jpg", secret: "must-not-leak" }],
        }],
        guestWebGrant: { secret: true },
      },
      timestamp: new Date().toISOString(),
    });
    await messages.insertOne({
      messageId: `pending-${crypto.randomUUID()}`,
      hotelId: HOTEL_ID,
      conversationId: bundle.conversationId,
      channel: "web",
      role: "ai",
      sender: "assistant",
      status: "pending",
      suggestion: "pending supervised secret",
      timestamp: new Date().toISOString(),
    });
    const response = await historyGET(request("/api/guest/web/history", {
      headers: { Authorization: `Bearer ${bundle.capability}` },
    }));
    const serialized = JSON.stringify(await response.json());
    expect(serialized).not.toContain("internal prompt");
    expect(serialized).not.toContain("ownership");
    expect(serialized).not.toContain("pending supervised secret");
    expect(serialized).not.toContain("unapproved fallback");
    expect(serialized).not.toContain("must-not-leak");
    expect(serialized).not.toContain("guestWebGrant");
    expect(serialized).toContain("safe guest-visible response");
    expect(serialized).toContain("Visible place");
  });

  it("returns more than twenty authorized messages in stable order without silent truncation", async () => {
    const bundle = await bootstrap();
    const messages = getCollection("messages");
    const base = Date.parse("2026-11-12T12:00:00.000Z");
    for (let index = 24; index >= 0; index -= 1) {
      await messages.insertOne({
        messageId: `long-history-${index}-${crypto.randomUUID()}`,
        hotelId: bundle.hotelId,
        conversationId: bundle.conversationId,
        channel: "web",
        role: "user",
        sender: "guest",
        direction: "in",
        status: "sent",
        content: `turn-${String(index).padStart(2, "0")}`,
        timestamp: new Date(base + index * 1_000).toISOString(),
      });
    }

    const response = await historyGET(request("/api/guest/web/history", {
      headers: { Authorization: `Bearer ${bundle.capability}` },
    }));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toMatchObject({ hotelId: bundle.hotelId, conversationId: bundle.conversationId });
    expect(payload.messages).toHaveLength(25);
    expect(payload.messages.map((message: { content: string }) => message.content)).toEqual(
      Array.from({ length: 25 }, (_, index) => `turn-${String(index).padStart(2, "0")}`),
    );
  });

  it("allows Authorization preflight only for explicitly permitted origins", async () => {
    const allowed = await middleware(new NextRequest("http://localhost/api/guest/web/history", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:8081" },
    }));
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081");
    expect(allowed.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");

    const denied = await middleware(new NextRequest("http://localhost/api/guest/web/history", {
      method: "OPTIONS",
      headers: { Origin: "https://untrusted.example" },
    }));
    expect(denied.status).toBe(204);
    expect(denied.headers.get("Access-Control-Allow-Origin")).toBeNull();

    vi.stubEnv("GUEST_WEB_ALLOWED_ORIGINS", "https://widget.example");
    const widget = await middleware(new NextRequest("http://localhost/api/guest/web/history", {
      method: "OPTIONS",
      headers: { Origin: "https://widget.example" },
    }));
    expect(widget.headers.get("Access-Control-Allow-Origin")).toBe("https://widget.example");

    const staff = await middleware(new NextRequest("http://localhost/api/admin/users", {
      method: "OPTIONS",
      headers: { Origin: "https://widget.example" },
    }));
    expect(staff.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});
