// Path: test/unit/email.sendingDisabledGate.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  handleChannelMessageMock,
  parseEmailToChannelMessageMock,
  getMessageByOriginalIdScopedMock,
  guardInboundOnceMock,
  clearGuardMock,
} = vi.hoisted(() => ({
  handleChannelMessageMock: vi.fn(),
  parseEmailToChannelMessageMock: vi.fn(),
  getMessageByOriginalIdScopedMock: vi.fn(),
  guardInboundOnceMock: vi.fn(),
  clearGuardMock: vi.fn(),
}));

vi.mock("@/lib/pipeline/handleChannelMessage", () => ({
  handleChannelMessage: handleChannelMessageMock,
}));

vi.mock("@/lib/parsers/emailParser", () => ({
  parseEmailToChannelMessage: parseEmailToChannelMessageMock,
}));

vi.mock("@/lib/db/messages", () => ({
  getMessageByOriginalIdScoped: getMessageByOriginalIdScopedMock,
}));

vi.mock("@/lib/db/messageGuards", () => ({
  guardInboundOnce: guardInboundOnceMock,
  clearGuard: clearGuardMock,
}));

vi.mock("@/lib/services/redis", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    eval: vi.fn(),
  },
}));

vi.mock("@/lib/services/heartbeat", () => ({
  startChannelHeartbeat: vi.fn(),
  stopChannelHeartbeat: vi.fn(),
}));

vi.mock("imap-simple", () => ({
  default: { connect: vi.fn() },
}));

vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn() },
}));

const parsedEmail = {
  from: { text: "guest@example.com" },
  subject: "Consulta",
  messageId: "<smtp-gate@example.com>",
};

async function loadEmailService(sendingEnabled: boolean, allowedRecipients?: string) {
  vi.resetModules();
  process.env.EMAIL_SENDING_ENABLED = String(sendingEnabled);
  if (allowedRecipients === undefined) {
    delete process.env.EMAIL_WORKER_ALLOWED_RECIPIENTS;
  } else {
    process.env.EMAIL_WORKER_ALLOWED_RECIPIENTS = allowedRecipients;
  }
  return import("@/lib/services/email");
}

describe("email worker sending disabled gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EMAIL_BOT_IGNORE_IDEMPOTENCY;
    getMessageByOriginalIdScopedMock.mockResolvedValue(null);
    guardInboundOnceMock.mockResolvedValue({ applied: true });
    clearGuardMock.mockResolvedValue(undefined);
    parseEmailToChannelMessageMock.mockResolvedValue({
      messageId: "parser-smtp-gate",
      conversationId: "hotel-email-gate-email-guest@example.com",
      hotelId: "hotel-email-gate",
      channel: "email",
      sender: "guest@example.com",
      guestId: "guest@example.com",
      content: "Consulta de prueba",
      suggestion: "",
      subject: "Consulta",
      recipient: "hotel@example.com",
      cc: [],
      bcc: [],
      attachments: [],
      references: [],
      inReplyTo: "",
      originalMessageId: "<smtp-gate@example.com>",
      isForwarded: false,
      role: "user",
    });
  });

  afterEach(() => {
    delete process.env.EMAIL_SENDING_ENABLED;
    delete process.env.EMAIL_WORKER_ALLOWED_RECIPIENTS;
    vi.restoreAllMocks();
  });

  it("procesa el inbound pero bloquea sendMail cuando el pipeline retorna sent y el flag es false", async () => {
    handleChannelMessageMock.mockResolvedValue({
      status: "sent",
      response: "Respuesta automática",
    });
    const service = await loadEmailService(false, "guest@example.com");
    const sendMail = vi.fn(async () => ({ accepted: ["guest@example.com"] }));
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sendReply = vi.fn(async (input) => service.sendEmailWorkerReply(
      { sendMail },
      { from: "hotel@example.com", ...input },
    ));

    const execution = await service.processInboundEmailMessage({
      hotelId: "hotel-email-gate",
      parsed: parsedEmail,
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply,
    });

    expect(parseEmailToChannelMessageMock).toHaveBeenCalledOnce();
    expect(handleChannelMessageMock).toHaveBeenCalledOnce();
    expect(execution.result).toMatchObject({ status: "sent", response: "Respuesta automática" });
    expect(sendReply).toHaveBeenCalledOnce();
    expect(sendMail).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[email] EMAIL_SENDING_ENABLED=false: respuesta SMTP bloqueada.",
    );
  });

  it.each([
    { status: "pending", response: "Pendiente" },
    { status: "failed", response: "Falló" },
    { status: "sent", response: "" },
  ])("no intenta SMTP para la ruta $status sin respuesta enviable", async (pipelineResult) => {
    handleChannelMessageMock.mockResolvedValue(pipelineResult);
    const service = await loadEmailService(false);
    const sendMail = vi.fn();
    const sendReply = vi.fn(async (input) => service.sendEmailWorkerReply(
      { sendMail },
      { from: "hotel@example.com", ...input },
    ));

    const execution = await service.processInboundEmailMessage({
      hotelId: "hotel-email-gate",
      parsed: parsedEmail,
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply,
    });

    expect(execution.result).toMatchObject(pipelineResult);
    expect(sendReply).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("preserva sendMail sin allowlist cuando el pipeline retorna sent y el flag es true", async () => {
    handleChannelMessageMock.mockResolvedValue({
      status: "sent",
      response: "Respuesta automática",
    });
    const service = await loadEmailService(true);
    const sendMail = vi.fn(async () => ({ accepted: ["guest@example.com"] }));
    const sendReply = vi.fn(async (input) => service.sendEmailWorkerReply(
      { sendMail },
      { from: "hotel@example.com", ...input },
    ));

    const execution = await service.processInboundEmailMessage({
      hotelId: "hotel-email-gate",
      parsed: parsedEmail,
      raw: "raw-email",
      mode: "automatic",
      emailUser: "hotel@example.com",
      sendReply,
    });

    expect(execution.result).toMatchObject({ status: "sent", response: "Respuesta automática" });
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail).toHaveBeenCalledWith({
      from: "hotel@example.com",
      to: "guest@example.com",
      subject: "Re: Consulta",
      text: "Respuesta automática",
    });
  });

  it("permite un destinatario explícitamente autorizado y preserva el payload", async () => {
    const service = await loadEmailService(true, "guest@example.com,other@example.com");
    const sendMail = vi.fn(async (_reply: unknown) => ({ accepted: ["guest@example.com"] }));
    const reply = {
      from: "hotel@example.com",
      to: "guest@example.com",
      subject: "Re: Consulta",
      text: "Respuesta automática",
    };

    await expect(service.sendEmailWorkerReply({ sendMail }, reply)).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0]?.[0]).toBe(reply);
  });

  it("normaliza espacios y mayúsculas/minúsculas para la coincidencia exacta", async () => {
    const service = await loadEmailService(true, "  Guest@Example.COM  ");
    const sendMail = vi.fn(async (_reply: unknown) => ({ accepted: ["guest@example.com"] }));
    const reply = {
      from: "hotel@example.com",
      to: "  GUEST@example.com  ",
      subject: "Re: Consulta",
      text: "Respuesta automática",
    };

    await expect(service.sendEmailWorkerReply({ sendMail }, reply)).resolves.toBe(true);
    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0]?.[0]).toBe(reply);
  });

  it("bloquea un destinatario no autorizado con log sanitizado", async () => {
    const service = await loadEmailService(true, "allowed@example.com");
    const sendMail = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.sendEmailWorkerReply(
      { sendMail },
      {
        from: "hotel@example.com",
        to: "other@example.com",
        subject: "Re: Consulta",
        text: "Respuesta automática",
      },
    )).resolves.toBe(false);

    expect(sendMail).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[email] EMAIL_WORKER_ALLOWED_RECIPIENTS: respuesta SMTP bloqueada. reason=recipient_not_allowed",
    );
  });

  it.each(["", "   "])("bloquea una allowlist presente pero vacía: %j", async (allowedRecipients) => {
    const service = await loadEmailService(true, allowedRecipients);
    const sendMail = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.sendEmailWorkerReply(
      { sendMail },
      {
        from: "hotel@example.com",
        to: "allowed@example.com",
        subject: "Re: Consulta",
        text: "Respuesta automática",
      },
    )).resolves.toBe(false);

    expect(sendMail).not.toHaveBeenCalled();
  });

  it.each([
    "allowed@example.com,not-an-email",
    "Allowed <allowed@example.com>",
    "allowed@example.com;other@example.com",
    "allowed@example.com,",
  ])("bloquea una allowlist malformada: %j", async (allowedRecipients) => {
    const service = await loadEmailService(true, allowedRecipients);
    const sendMail = vi.fn();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(service.sendEmailWorkerReply(
      { sendMail },
      {
        from: "hotel@example.com",
        to: "allowed@example.com",
        subject: "Re: Consulta",
        text: "Respuesta automática",
      },
    )).resolves.toBe(false);

    expect(sendMail).not.toHaveBeenCalled();
  });

  it.each([
    ["destinatarios separados por coma", { to: "allowed@example.com,other@example.com" }],
    ["destinatarios separados por punto y coma", { to: "allowed@example.com;other@example.com" }],
    ["display name", { to: "Allowed <allowed@example.com>" }],
    ["lista de destinatarios", { to: ["allowed@example.com"] }],
    ["CC", { to: "allowed@example.com", cc: "other@example.com" }],
    ["BCC", { to: "allowed@example.com", bcc: "other@example.com" }],
    ["envelope SMTP", { to: "allowed@example.com", envelope: { to: "other@example.com" } }],
  ])("bloquea un destinatario ambiguo mediante %s", async (_caseName, recipientFields) => {
    const service = await loadEmailService(true, "allowed@example.com");
    const sendMail = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const reply = {
      from: "hotel@example.com",
      subject: "Re: Consulta",
      text: "Respuesta automática",
      ...recipientFields,
    } as any;

    await expect(service.sendEmailWorkerReply({ sendMail }, reply)).resolves.toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[email] EMAIL_WORKER_ALLOWED_RECIPIENTS: respuesta SMTP bloqueada. reason=ambiguous_recipient",
    );
  });
});
