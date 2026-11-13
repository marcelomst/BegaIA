// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const widgetSource = readFileSync(join(process.cwd(), "public/widget/begai-chat.js"), "utf8");

function readPendingTurn(): any | null {
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.includes("guestWebPendingTurn.v1") && !key.includes(":index:")) {
      return JSON.parse(sessionStorage.getItem(key) || "null");
    }
  }
  return null;
}

function runWidget() {
  window.eval(widgetSource);
}

async function flushWidgetTasks() {
  await vi.advanceTimersByTimeAsync(0);
  await Promise.resolve();
}

function findSessionKey(fragment: string): string | null {
  for (let index = 0; index < sessionStorage.length; index += 1) {
    const key = sessionStorage.key(index);
    if (key?.includes(fragment)) return key;
  }
  return null;
}

describe("public BegAI widget Guest capability containment", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    sessionStorage.clear();
    localStorage.clear();
    window.name = "";
    delete (window as any).BegAIChat;
    delete (window as any).BegasistChat;
    (window as any).BegAIChat = {
      apiBase: "https://api.test",
      hotelId: "hotel999",
    };
  });

  afterEach(() => {
    window.dispatchEvent(new Event("pagehide"));
    vi.useRealTimers();
  });

  it("usa capability por header, sessionStorage y mantiene SSE deshabilitado", () => {
    const source = widgetSource;

    const payloadBlock = source.slice(source.indexOf("const payload = {"), source.indexOf("debug(\"chat.request\""));
    expect(payloadBlock).not.toContain("guestId");
    expect(source).toContain("Authorization: `Bearer ${bundle.capability}`");
    expect(source).toContain('scopedSessionKey("guestWebConversation.v1")');
    expect(source).not.toContain("localStorage.setItem(guestKey");
    expect(source).not.toContain("new EventSource(");
    expect(source).toContain("clearBundle();");
    expect(source).toContain('markPendingTurn(pending, "sending")');
    expect(source).toContain('markPendingTurn(pending, "uncertain")');
    expect(source).toContain("messageId: pending.messageId");
    expect(source).not.toContain("messageId: crypto.randomUUID()");
  });

  it("muestra una aprobación supervisada una sola vez sin exponer pending interno", async () => {
    vi.useFakeTimers();
    let historyCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        return new Response(JSON.stringify({
          capability: "widget-supervised-capability",
          conversationId: "conv-widget-supervised",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) {
        return new Response(JSON.stringify({
          status: "pending",
          messageId: "guest:source-supervised-1",
          conversationId: "conv-widget-supervised",
        }), { status: 200 });
      }
      if (url.endsWith("/api/guest/web/history")) {
        historyCalls += 1;
        if (historyCalls === 1) {
          return new Response(JSON.stringify({
            hotelId: "hotel999",
            conversationId: "conv-widget-foreign",
            messages: [{
              messageId: "assistant-foreign-1",
              role: "assistant",
              status: "sent",
              content: "Respuesta de otra conversación.",
            }],
          }), { status: 200 });
        }
        return new Response(JSON.stringify({
          hotelId: "hotel999",
          conversationId: "conv-widget-supervised",
          messages: [
            {
              messageId: "assistant-stale-1",
              role: "assistant",
              status: "sent",
              content: "Respuesta anterior que no corresponde al turno pendiente.",
            },
            {
              messageId: "guest:source-supervised-1",
              role: "user",
              status: "sent",
              content: "Consulta supervisada",
            },
            {
              messageId: "assistant-pending-internal",
              role: "assistant",
              status: "pending",
              content: "sugerencia interna pendiente",
            },
            {
              messageId: "assistant-supervised-approved-1",
              role: "assistant",
              status: "sent",
              content: "Respuesta aprobada desde recepción.",
            },
          ],
        }), { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    }));

    runWidget();
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    textarea.value = "Consulta supervisada";
    document.querySelector<HTMLButtonElement>("#bgst-send")!.click();
    await flushWidgetTasks();

    expect(document.body.textContent).toContain("Recepción está revisando tu consulta.");
    expect(historyCalls).toBe(0);

    await vi.advanceTimersByTimeAsync(4_000);
    await flushWidgetTasks();

    expect(historyCalls).toBe(1);
    expect(document.body.textContent).not.toContain("Respuesta de otra conversación.");
    expect(document.body.textContent).not.toContain("Respuesta aprobada desde recepción.");

    await vi.advanceTimersByTimeAsync(4_000);
    await flushWidgetTasks();

    expect(historyCalls).toBe(2);
    expect(document.body.textContent).toContain("Respuesta aprobada desde recepción.");
    expect(document.body.textContent).not.toContain("Respuesta anterior que no corresponde");
    expect(document.body.textContent).not.toContain("sugerencia interna pendiente");
    expect(document.querySelector(".bgst-supervised-wait")).toBeNull();
    expect([...document.querySelectorAll(".bgst-ai")].filter((node) =>
      node.textContent === "Respuesta aprobada desde recepción."
    )).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(12_000);
    expect(historyCalls).toBe(2);
  });

  it("presenta continuidad visual entre pendientes supervisados de la misma conversación", async () => {
    vi.useFakeTimers();
    let bootstrapCalls = 0;
    let chatCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        bootstrapCalls += 1;
        const conversationId = bootstrapCalls === 1
          ? "conv-widget-supervised-continuity"
          : "conv-widget-supervised-new";
        return new Response(JSON.stringify({
          capability: "widget-supervised-continuity-capability",
          conversationId,
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) {
        chatCalls += 1;
        return new Response(JSON.stringify({
          status: "pending",
          messageId: `guest:supervised-continuity-${chatCalls}`,
          conversationId: chatCalls < 3
            ? "conv-widget-supervised-continuity"
            : "conv-widget-supervised-new",
        }), { status: 200 });
      }
      if (url.endsWith("/api/guest/web/history")) {
        const messages = [
          {
            messageId: "guest:supervised-continuity-1",
            role: "user",
            status: "sent",
            content: "Quiero hacer una reserva",
          },
          {
            messageId: "assistant:supervised-continuity-1",
            role: "assistant",
            status: "sent",
            content: "¿Cuál es el tipo de habitación?",
          },
        ];
        if (chatCalls > 1) {
          messages.push(
            {
              messageId: "guest:supervised-continuity-2",
              role: "user",
              status: "sent",
              content: "Doble",
            },
            {
              messageId: "assistant:supervised-continuity-2",
              role: "assistant",
              status: "sent",
              content: "¿Cuál sería la fecha de check-in?",
            },
          );
        }
        return new Response(JSON.stringify({
          hotelId: "hotel999",
          conversationId: "conv-widget-supervised-continuity",
          messages,
        }), { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    }));

    runWidget();
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    const send = document.querySelector<HTMLButtonElement>("#bgst-send")!;

    textarea.value = "Quiero hacer una reserva";
    send.click();
    await flushWidgetTasks();

    expect(document.querySelector(".bgst-supervised-wait--first")?.textContent)
      .toBe("Recepción está revisando tu consulta.");

    await vi.advanceTimersByTimeAsync(4_000);
    await flushWidgetTasks();

    expect(document.body.textContent).toContain("¿Cuál es el tipo de habitación?");
    expect(document.querySelector(".bgst-supervised-wait")).toBeNull();

    textarea.value = "Doble";
    send.click();
    await flushWidgetTasks();

    expect(document.querySelector(".bgst-supervised-wait--subsequent")?.textContent)
      .toBe("Esperando respuesta de recepción…");
    expect(document.querySelectorAll(".bgst-supervised-wait--first")).toHaveLength(0);

    await vi.advanceTimersByTimeAsync(4_000);
    await flushWidgetTasks();

    expect(document.body.textContent).toContain("¿Cuál sería la fecha de check-in?");
    expect(document.querySelector(".bgst-supervised-wait")).toBeNull();
    expect([...document.querySelectorAll(".bgst-ai")].filter((node) =>
      node.textContent === "¿Cuál sería la fecha de check-in?"
    )).toHaveLength(1);

    document.querySelector<HTMLButtonElement>("#bgst-newchat")!.click();
    await flushWidgetTasks();
    textarea.value = "Nueva consulta supervisada";
    send.click();
    await flushWidgetTasks();

    expect(document.querySelector(".bgst-supervised-wait--first")?.textContent)
      .toBe("Recepción está revisando tu consulta.");
    expect(document.querySelector(".bgst-supervised-wait--subsequent")).toBeNull();
  });

  it("no inicia polling para respuestas automáticas", async () => {
    vi.useFakeTimers();
    let historyCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        return new Response(JSON.stringify({
          capability: "widget-automatic-capability",
          conversationId: "conv-widget-automatic",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) {
        return new Response(JSON.stringify({
          status: "sent",
          response: "Respuesta automática.",
          messageId: "assistant-automatic-1",
        }), { status: 200 });
      }
      if (url.endsWith("/api/guest/web/history")) {
        historyCalls += 1;
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }
      return new Response("Not Found", { status: 404 });
    }));

    runWidget();
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    textarea.value = "Consulta automática";
    document.querySelector<HTMLButtonElement>("#bgst-send")!.click();
    await flushWidgetTasks();
    await vi.advanceTimersByTimeAsync(20_000);

    expect(document.body.textContent).toContain("Respuesta automática.");
    expect(historyCalls).toBe(0);
  });

  it("evita polling concurrente y lo detiene al cerrar el widget", async () => {
    vi.useFakeTimers();
    let historyCalls = 0;
    const historyRequest: { resolve?: (response: Response) => void } = {};
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        return new Response(JSON.stringify({
          capability: "widget-supervised-close-capability",
          conversationId: "conv-widget-supervised-close",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) {
        return new Response(JSON.stringify({
          status: "pending",
          messageId: "guest:supervised-close-1",
        }), { status: 200 });
      }
      if (url.endsWith("/api/guest/web/history")) {
        historyCalls += 1;
        return new Promise<Response>((resolve) => { historyRequest.resolve = resolve; });
      }
      return new Response("Not Found", { status: 404 });
    }));

    runWidget();
    document.querySelector<HTMLButtonElement>(".bgst-bubble")!.click();
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    textarea.value = "Consulta supervisada larga";
    document.querySelector<HTMLButtonElement>("#bgst-send")!.click();
    await flushWidgetTasks();
    await vi.advanceTimersByTimeAsync(4_000);

    expect(historyCalls).toBe(1);
    await vi.advanceTimersByTimeAsync(20_000);
    expect(historyCalls).toBe(1);
    expect(document.querySelectorAll(".bgst-supervised-wait")).toHaveLength(1);

    document.querySelector<HTMLButtonElement>(".bgst-close")!.click();
    historyRequest.resolve?.(new Response(JSON.stringify({
      messages: [
        {
          messageId: "guest:supervised-close-1",
          role: "user",
          status: "sent",
          content: "Consulta supervisada larga",
        },
        {
          messageId: "assistant-supervised-close-1",
          role: "assistant",
          status: "sent",
          content: "Respuesta al reabrir.",
        },
      ],
    }), { status: 200 }));
    await flushWidgetTasks();
    await vi.advanceTimersByTimeAsync(20_000);

    expect(historyCalls).toBe(1);
    expect(document.body.textContent).not.toContain("Respuesta al reabrir.");
    expect(document.querySelectorAll(".bgst-supervised-wait")).toHaveLength(1);

    document.querySelector<HTMLButtonElement>(".bgst-bubble")!.click();
    await vi.advanceTimersByTimeAsync(4_000);
    expect(historyCalls).toBe(2);
    historyRequest.resolve?.(new Response(JSON.stringify({
      messages: [
        {
          messageId: "guest:supervised-close-1",
          role: "user",
          status: "sent",
          content: "Consulta supervisada larga",
        },
        {
          messageId: "assistant-supervised-close-1",
          role: "assistant",
          status: "sent",
          content: "Respuesta al reabrir.",
        },
      ],
    }), { status: 200 }));
    await flushWidgetTasks();

    expect(document.body.textContent).toContain("Respuesta al reabrir.");
    expect(document.querySelector(".bgst-supervised-wait")).toBeNull();
  });

  it("aborta una consulta colgada y termina el polling al alcanzar el límite temporal", async () => {
    vi.useFakeTimers();
    let historyCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        return new Response(JSON.stringify({
          capability: "widget-supervised-timeout-capability",
          conversationId: "conv-widget-supervised-timeout",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) {
        return new Response(JSON.stringify({
          status: "pending",
          messageId: "assistant-supervised-timeout-1",
        }), { status: 200 });
      }
      if (url.endsWith("/api/guest/web/history")) {
        historyCalls += 1;
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }
      return new Response("Not Found", { status: 404 });
    }));

    runWidget();
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    textarea.value = "Consulta supervisada sin aprobación";
    document.querySelector<HTMLButtonElement>("#bgst-send")!.click();
    await flushWidgetTasks();
    await vi.advanceTimersByTimeAsync(4_000);

    expect(historyCalls).toBe(1);
    expect(textarea.disabled).toBe(true);

    await vi.advanceTimersByTimeAsync(116_000);
    await flushWidgetTasks();

    expect(textarea.disabled).toBe(false);
    expect(document.querySelector(".bgst-supervised-wait")).toBeNull();
    expect(document.body.textContent)
      .toContain("No recibimos una respuesta dentro del tiempo de espera. Podés volver a intentarlo.");
    await vi.advanceTimersByTimeAsync(20_000);
    expect(historyCalls).toBe(1);
  });

  it("conserva el mismo messageId tras pérdida de respuesta y recarga sin reintento automático", async () => {
    const chatBodies: any[] = [];
    let durableEffects = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        return new Response(JSON.stringify({
          capability: "widget-capability-loss",
          conversationId: "conv-widget-loss",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/guest/web/history")) {
        return new Response(JSON.stringify({ messages: [] }), { status: 200 });
      }
      if (url.endsWith("/api/chat")) {
        chatBodies.push(JSON.parse(String(init?.body || "{}")));
        durableEffects += 1;
        throw new TypeError("response lost after persistence");
      }
      return new Response("Not Found", { status: 404 });
    }));

    runWidget();
    await vi.waitFor(() => expect(
      [...Array(sessionStorage.length)].some((_, index) => sessionStorage.key(index)?.includes("guestWebConversation.v1")),
    ).toBe(true));
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    const send = document.querySelector<HTMLButtonElement>("#bgst-send")!;
    textarea.value = "widget turno perdido";
    send.click();

    await vi.waitFor(() => expect(readPendingTurn()?.status).toBe("uncertain"));
    expect(chatBodies).toHaveLength(1);
    expect(durableEffects).toBe(1);
    const stableId = readPendingTurn().messageId;
    expect(chatBodies[0].messageId).toBe(stableId);
    expect(send.disabled).toBe(true);
    send.click();
    expect(chatBodies).toHaveLength(1);

    document.head.innerHTML = "";
    document.body.innerHTML = "";
    runWidget();
    await vi.waitFor(() => expect(document.body.textContent).toContain("envío anterior no pudo confirmarse"));
    expect(chatBodies).toHaveLength(1);
    expect(readPendingTurn().messageId).toBe(stableId);
    expect(document.querySelector<HTMLButtonElement>("#bgst-send")?.disabled).toBe(true);
    expect([...document.querySelectorAll(".bgst-user")].filter((node) => node.textContent === "widget turno perdido"))
      .toHaveLength(1);
  });

  it.each([
    [202, {
      status: "reconciliation_required",
      outcome: "completed_reconciliation_required",
      continuationAvailable: false,
      retry: "do_not_retry",
    }],
    [409, {
      status: "reconciliation_required",
      code: "guest_turn_already_recorded",
      continuationAvailable: false,
      retry: "do_not_retry",
    }],
  ])("bloquea nuevos turnos ante HTTP %s incierto", async (status, payload) => {
    let chatCalls = 0;
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        return new Response(JSON.stringify({
          capability: "widget-capability-uncertain",
          conversationId: "conv-widget-uncertain",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) {
        chatCalls += 1;
        return new Response(JSON.stringify(payload), { status });
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }));

    runWidget();
    await vi.waitFor(() => expect(document.querySelector("#bgst-send")).not.toBeNull());
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    const send = document.querySelector<HTMLButtonElement>("#bgst-send")!;
    textarea.value = "widget incierto";
    send.click();

    await vi.waitFor(() => expect(readPendingTurn()?.status).toBe("uncertain"));
    expect(chatCalls).toBe(1);
    expect(send.disabled).toBe(true);
    expect(document.body.textContent).not.toContain("respuesta entregada");
  });

  it("habilita un turno nuevo sólo después de una respuesta normal confirmada", async () => {
    const chatBodies: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        return new Response(JSON.stringify({
          capability: "widget-capability-ok",
          conversationId: "conv-widget-ok",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) {
        chatBodies.push(JSON.parse(String(init?.body || "{}")));
        return new Response(JSON.stringify({ status: "sent", response: `respuesta ${chatBodies.length}` }), { status: 200 });
      }
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }));

    runWidget();
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    const send = document.querySelector<HTMLButtonElement>("#bgst-send")!;
    textarea.value = "primer turno";
    send.click();
    await vi.waitFor(() => expect(document.body.textContent).toContain("respuesta 1"));
    expect(readPendingTurn()).toBeNull();
    expect(send.disabled).toBe(false);

    textarea.value = "segundo turno";
    send.click();
    await vi.waitFor(() => expect(document.body.textContent).toContain("respuesta 2"));
    expect(chatBodies).toHaveLength(2);
    expect(chatBodies[1].messageId).not.toBe(chatBodies[0].messageId);
  });

  it.each(["expired", "invalid", "missing"] as const)(
    "recupera el pending huérfano con bundle %s sin bootstrap ni retry",
    async (bundleState) => {
      let bootstrapCalls = 0;
      let historyCalls = 0;
      const chatBodies: any[] = [];
      vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.endsWith("/api/guest/web/bootstrap")) {
          bootstrapCalls += 1;
          return new Response(JSON.stringify({
            capability: "widget-orphan-capability",
            conversationId: "conv-widget-orphan",
            hotelId: "hotel999",
            expiresAt: "2099-01-01T00:00:00.000Z",
          }), { status: 201 });
        }
        if (url.endsWith("/api/guest/web/history")) {
          historyCalls += 1;
          return new Response(JSON.stringify({ messages: [] }), { status: 200 });
        }
        if (url.endsWith("/api/chat")) {
          chatBodies.push(JSON.parse(String(init?.body || "{}")));
          throw new TypeError("response lost");
        }
        return new Response("Not Found", { status: 404 });
      }));

      runWidget();
      await vi.waitFor(() => expect(findSessionKey("guestWebConversation.v1")).not.toBeNull());
      const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
      textarea.value = "widget pending huérfano";
      document.querySelector<HTMLButtonElement>("#bgst-send")!.click();
      await vi.waitFor(() => expect(readPendingTurn()?.status).toBe("uncertain"));
      const originalMessageId = readPendingTurn().messageId;
      const bundleKey = findSessionKey("guestWebConversation.v1")!;
      if (bundleState === "expired") {
        const bundle = JSON.parse(sessionStorage.getItem(bundleKey)!);
        sessionStorage.setItem(bundleKey, JSON.stringify({ ...bundle, expiresAt: "2020-01-01T00:00:00.000Z" }));
      } else if (bundleState === "invalid") {
        sessionStorage.setItem(bundleKey, "{invalid-json");
      } else {
        sessionStorage.removeItem(bundleKey);
      }

      document.head.innerHTML = "";
      document.body.innerHTML = "";
      runWidget();

      await vi.waitFor(() => expect(document.body.textContent).toContain("sigue sin confirmarse"));
      expect(bootstrapCalls).toBe(1);
      expect(historyCalls).toBe(0);
      expect(chatBodies).toHaveLength(1);
      expect(readPendingTurn()).toMatchObject({
        messageId: originalMessageId,
        conversationId: "conv-widget-orphan",
        text: "widget pending huérfano",
      });
      expect(document.querySelector<HTMLTextAreaElement>("#bgst-input")?.disabled).toBe(true);
      expect(document.querySelector<HTMLButtonElement>("#bgst-send")?.disabled).toBe(true);
      expect(document.querySelector<HTMLButtonElement>("#bgst-newchat")?.disabled).toBe(true);
      document.querySelector<HTMLButtonElement>("#bgst-send")?.click();
      expect(chatBodies).toHaveLength(1);
    },
  );

  it.each([401, 403])("conserva el pending cuando history responde %s", async (status) => {
    let historyCalls = 0;
    let bootstrapCalls = 0;
    const chatBodies: any[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        bootstrapCalls += 1;
        return new Response(JSON.stringify({
          capability: "widget-history-capability",
          conversationId: "conv-widget-history",
          hotelId: "hotel999",
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/guest/web/history")) {
        historyCalls += 1;
        return new Response(JSON.stringify({ error: "denied" }), { status });
      }
      if (url.endsWith("/api/chat")) {
        chatBodies.push(JSON.parse(String(init?.body || "{}")));
        return new Response(JSON.stringify({
          status: "reconciliation_required",
          continuationAvailable: false,
          retry: "do_not_retry",
        }), { status: 202 });
      }
      return new Response("Not Found", { status: 404 });
    }));

    runWidget();
    await vi.waitFor(() => expect(findSessionKey("guestWebConversation.v1")).not.toBeNull());
    const textarea = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    textarea.value = "widget history denegado";
    document.querySelector<HTMLButtonElement>("#bgst-send")!.click();
    await vi.waitFor(() => expect(readPendingTurn()?.status).toBe("uncertain"));
    const originalMessageId = readPendingTurn().messageId;

    document.head.innerHTML = "";
    document.body.innerHTML = "";
    runWidget();

    await vi.waitFor(() => expect(historyCalls).toBe(1));
    expect(document.body.textContent).toContain("sigue sin confirmarse");
    expect(bootstrapCalls).toBe(1);
    expect(chatBodies).toHaveLength(1);
    expect(readPendingTurn()?.messageId).toBe(originalMessageId);
    expect(findSessionKey("guestWebConversation.v1")).toBeNull();
    expect(document.querySelector<HTMLButtonElement>("#bgst-newchat")?.disabled).toBe(true);
  });

  it("mantiene aislado el pending del hotel A al iniciar el widget del hotel B", async () => {
    const bootstrappedHotels: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/api/guest/web/bootstrap")) {
        const body = JSON.parse(String(init?.body || "{}"));
        bootstrappedHotels.push(body.hotelId);
        return new Response(JSON.stringify({
          capability: `capability-${body.hotelId}`,
          conversationId: `conversation-${body.hotelId}`,
          hotelId: body.hotelId,
          expiresAt: "2099-01-01T00:00:00.000Z",
        }), { status: 201 });
      }
      if (url.endsWith("/api/chat")) throw new TypeError("response lost");
      return new Response(JSON.stringify({ messages: [] }), { status: 200 });
    }));

    runWidget();
    await vi.waitFor(() => expect(bootstrappedHotels).toContain("hotel999"));
    const textareaA = document.querySelector<HTMLTextAreaElement>("#bgst-input")!;
    textareaA.value = "pending hotel A";
    document.querySelector<HTMLButtonElement>("#bgst-send")!.click();
    await vi.waitFor(() => expect(readPendingTurn()?.status).toBe("uncertain"));
    const hotelAMessageId = readPendingTurn().messageId;

    document.head.innerHTML = "";
    document.body.innerHTML = "";
    (window as any).BegAIChat = { apiBase: "https://api.test", hotelId: "hotelB" };
    runWidget();

    await vi.waitFor(() => expect(bootstrappedHotels).toContain("hotelB"));
    expect(document.querySelector<HTMLTextAreaElement>("#bgst-input")?.disabled).toBe(false);
    const hotelARecord = [...Array(sessionStorage.length)]
      .map((_, index) => sessionStorage.key(index))
      .find((key) => key?.includes("guestWebPendingTurn.v1") && key.includes("hotel999") && !key.includes(":index:"));
    expect(JSON.parse(sessionStorage.getItem(hotelARecord!)!).messageId).toBe(hotelAMessageId);
  });
});
