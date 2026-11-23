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

async function loadEmailService(sendingEnabled: boolean) {
  vi.resetModules();
  process.env.EMAIL_SENDING_ENABLED = String(sendingEnabled);
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
    vi.restoreAllMocks();
  });

  it("procesa el inbound pero bloquea sendMail cuando el pipeline retorna sent y el flag es false", async () => {
    handleChannelMessageMock.mockResolvedValue({
      status: "sent",
      response: "Respuesta automática",
    });
    const service = await loadEmailService(false);
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

  it("preserva sendMail cuando el pipeline retorna sent y el flag es true", async () => {
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
});
