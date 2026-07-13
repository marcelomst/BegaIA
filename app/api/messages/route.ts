// /app/api/messages/route.ts

import { NextResponse } from "next/server";
import {
  getMessagesFromChannel,
  updateMessageInChannel,
} from "@/lib/services/messages";
import { getMessageById, getMessagesByConversation, updateMessageInAstra } from "@/lib/db/messages";
import { channelHandlers } from "@/lib/services/channelHandlers";
import { parseChannel } from "@/lib/utils/parseChannel";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { toTwilioWhatsAppAddress, twilioSendWhatsAppMessage } from "@/lib/channels/whatsapp/twilioSendMessage";
import { getHotelConfig } from "@/lib/config/hotelConfig.server";
import { getGuest } from "@/lib/db/guests";
import { getGuestAliasesByGuestId } from "@/lib/db/guestAliases";
import { resolveEmailCredentials } from "@/lib/email/resolveEmailCredentials";
import { sendEmail } from "@/lib/email/sendEmail";
import { deriveGuestReadAliases } from "@/lib/utils/guestReadAliases";
import { emitToConversation } from "@/lib/web/eventBus";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isEmailSupervisedApprovalDebugEnabled(): boolean {
  return process.env.DEBUG_EMAIL_SUPERVISED_APPROVAL === "1";
}

function logEmailSupervisedApproval(stage: string, payload: Record<string, unknown>) {
  if (!isEmailSupervisedApprovalDebugEnabled()) return;
  console.log("[email-supervised]", stage, payload);
}

function isInvalidEmailLoginError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /invalid login|username and password not accepted|535-5\.7\.8/i.test(message);
}

function looksLikeWhatsAppDeliveryAddress(value: unknown): boolean {
  const trimmed = normalizeText(value);
  if (!trimmed) return false;
  const bare = trimmed.toLowerCase().startsWith("whatsapp:")
    ? trimmed.slice("whatsapp:".length).trim()
    : trimmed;
  return /^\+?\d{6,15}$/.test(bare);
}

async function resolveWhatsAppApprovalTo(input: {
  hotelId: string;
  guestId?: string | null;
  requestedTo?: string | null;
  current?: Record<string, any> | null;
}): Promise<string | null> {
  const candidates = new Set<string>();
  const pushCandidate = (value: unknown) => {
    const trimmed = normalizeText(value);
    if (trimmed && looksLikeWhatsAppDeliveryAddress(trimmed)) {
      candidates.add(toTwilioWhatsAppAddress(trimmed));
    }
  };

  pushCandidate(input.requestedTo);
  pushCandidate(input.current?.meta?.channelAddress);
  pushCandidate(input.current?.meta?.senderJid);
  pushCandidate(input.current?.meta?.from);
  pushCandidate(input.current?.sender);
  pushCandidate(input.current?.guestId);

  const guestId = normalizeText(input.guestId);
  if (guestId) {
    const [guest, aliasRows] = await Promise.all([
      getGuest(input.hotelId, guestId).catch(() => null),
      getGuestAliasesByGuestId({ hotelId: input.hotelId, guestId }).catch(() => []),
    ]);
    const aliases = deriveGuestReadAliases(
      guest,
      aliasRows.map((row) => normalizeText(row.alias)).filter(Boolean),
    );
    aliases.forEach(pushCandidate);
  }

  return candidates.values().next().value ?? null;
}

function looksLikeEmailAddress(value: unknown): boolean {
  const trimmed = normalizeText(value);
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(trimmed);
}

function normalizeReplySubject(subject: unknown): string {
  const trimmed = normalizeText(subject);
  if (!trimmed) return "Re: Consulta";
  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

function plainTextToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}

async function resolveEmailApprovalContext(input: {
  hotelId: string;
  requestedTo?: string | null;
  current: Record<string, any>;
}) {
  const candidates: Array<Record<string, any>> = [input.current];
  const conversationId = normalizeText(input.current.conversationId);
  if (conversationId) {
    const threadMessages = await getMessagesByConversation({
      hotelId: input.hotelId,
      conversationId,
      channel: "email",
      limit: 20,
    }).catch(() => []);
    candidates.push(...threadMessages);
  }

  const inbound = candidates.find(
    (message) =>
      message?.channel === "email" &&
      (message.direction === "in" || message.role === "user") &&
      looksLikeEmailAddress(message.sender),
  );

  const requestedTo = looksLikeEmailAddress(input.requestedTo) ? normalizeText(input.requestedTo) : "";
  const currentRecipient = looksLikeEmailAddress(input.current.recipient) ? normalizeText(input.current.recipient) : "";
  const inboundSender = looksLikeEmailAddress(inbound?.sender) ? normalizeText(inbound?.sender) : "";
  const guestId = looksLikeEmailAddress(input.current.guestId) ? normalizeText(input.current.guestId) : "";
  const sender = looksLikeEmailAddress(input.current.sender) ? normalizeText(input.current.sender) : "";

  const to = requestedTo || inboundSender || currentRecipient || guestId || sender;
  return {
    to,
    source: requestedTo
      ? "requestedTo"
      : inboundSender
        ? "inbound.sender"
        : currentRecipient
          ? "current.recipient"
          : guestId
            ? "current.guestId"
            : sender
              ? "current.sender"
              : "none",
    subject: normalizeReplySubject(input.current.subject || inbound?.subject),
    originalMessageId: normalizeText(input.current.originalMessageId || inbound?.originalMessageId),
  };
}

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const url = new URL(req.url);
  const rawChannel = url.searchParams.get("channelId");
  const channel = parseChannel(rawChannel);

  if (!channel) {
    return NextResponse.json({ error: "Canal no permitido" }, { status: 400 });
  }

  const messages = await getMessagesFromChannel(user.hotelId, channel);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const {
      action,
      messageId,
      approvedResponse,
      status,
      respondedBy,
      to,
      channel: rawChannel,
    } = await req.json();

    const channel = parseChannel(rawChannel);

    if (!messageId || !channel || !(channel in channelHandlers)) {
      return NextResponse.json(
        { error: "Datos inválidos o canal no soportado" },
        { status: 400 }
      );
    }

    if (action === "approve_and_send") {
      logEmailSupervisedApproval("backend_enter", {
        action,
        channel,
        messageId,
      });
      if (channel !== "whatsapp" && channel !== "email") {
        return NextResponse.json(
          { error: "approve_and_send solo está soportado para WhatsApp y Email" },
          { status: 400 }
        );
      }
      const current = await getMessageById(messageId);
      if (channel === "email") {
        logEmailSupervisedApproval("pending", {
          found: Boolean(current),
          status: current?.status,
          conversationId: current?.conversationId,
          messageChannel: current?.channel,
        });
      }
      if (!current || current.hotelId !== user.hotelId) {
        return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
      }
      if (current.channel !== channel) {
        return NextResponse.json(
          { error: "El canal del mensaje no coincide con la solicitud" },
          { status: 400 }
        );
      }
      if (current.status === "sent") {
        return NextResponse.json({ success: true, deduped: true });
      }
      if (current.status !== "pending") {
        return NextResponse.json(
          { error: `El mensaje no está en estado pendiente de ${channel}` },
          { status: 400 }
        );
      }

      const textToSend =
        (typeof approvedResponse === "string" && approvedResponse.trim()) ||
        current.approvedResponse ||
        current.suggestion ||
        current.content ||
        "";
      if (!textToSend) {
        return NextResponse.json({ error: "No hay texto para enviar" }, { status: 400 });
      }

      if (channel === "email") {
        const emailTarget = await resolveEmailApprovalContext({
          hotelId: user.hotelId,
          requestedTo: typeof to === "string" ? to : "",
          current,
        });
        if (!emailTarget.to) {
          logEmailSupervisedApproval("recipient", {
            recipient: "",
            source: emailTarget.source,
            conversationId: current.conversationId,
          });
          return NextResponse.json(
            { error: "No se pudo resolver destinatario Email para entrega" },
            { status: 400 },
          );
        }

        const hotelConfig = await getHotelConfig(user.hotelId);
        const emailConfig = hotelConfig?.channelConfigs?.email;
        const credentials = resolveEmailCredentials(emailConfig);
        logEmailSupervisedApproval("smtp_config", {
          hasHost: Boolean(credentials?.host),
          hasUser: Boolean(credentials?.user),
          hasPass: Boolean(credentials?.pass),
          from: credentials?.user || null,
          source: credentials?.source || "none",
          reason: credentials?.reason || null,
        });
        if (!credentials || !credentials.pass || credentials.source === "none") {
          return NextResponse.json(
            { success: false, error: credentials?.reason || "Credenciales Email no configuradas" },
            { status: 400 },
          );
        }

        const smtpConfig = {
          host: credentials.host,
          port: credentials.port,
          user: credentials.user,
          pass: credentials.pass,
          secure: credentials.secure ?? false,
        };

        try {
          logEmailSupervisedApproval("recipient", {
            recipient: emailTarget.to,
            source: emailTarget.source,
            subject: emailTarget.subject,
            conversationId: current.conversationId,
          });
          logEmailSupervisedApproval("sendEmail_call", {
            to: emailTarget.to,
            subject: emailTarget.subject,
            bodyChars: textToSend.length,
            credentialSource: credentials.source,
          });
          try {
            await sendEmail(smtpConfig, emailTarget.to, emailTarget.subject, plainTextToHtml(textToSend));
          } catch (firstError) {
            const altPass = process.env.EMAIL_PASS;
            if (
              isInvalidEmailLoginError(firstError) &&
              credentials.source === "inline" &&
              altPass &&
              altPass !== credentials.pass
            ) {
              logEmailSupervisedApproval("sendEmail_fallback", {
                reason: "invalid_inline_credentials",
                fallback: "EMAIL_PASS",
              });
              await sendEmail(
                { ...smtpConfig, pass: altPass },
                emailTarget.to,
                emailTarget.subject,
                plainTextToHtml(textToSend),
              );
            } else {
              throw firstError;
            }
          }

          await updateMessageInAstra(user.hotelId, messageId, {
            approvedResponse: textToSend,
            status: "sent",
            respondedBy: respondedBy || user.email,
            deliveredAt: new Date().toISOString(),
            meta: {
              ...(current.meta || {}),
              emailOutboundTo: emailTarget.to,
              emailOriginalMessageId: emailTarget.originalMessageId || null,
            },
          });
          logEmailSupervisedApproval("sendEmail_result", {
            ok: true,
            messageId,
            statusAfter: "sent",
          });

          return NextResponse.json({ success: true });
        } catch (error) {
          logEmailSupervisedApproval("sendEmail_result", {
            ok: false,
            messageId,
            error: error instanceof Error ? error.message : "Email send failed",
            statusAfter: current.status,
          });
          return NextResponse.json(
            {
              success: false,
              error: error instanceof Error ? error.message : "Email send failed",
            },
            { status: 502 },
          );
        }
      }

      const twilioTo = await resolveWhatsAppApprovalTo({
        hotelId: user.hotelId,
        guestId: current.guestId,
        requestedTo: typeof to === "string" ? to : "",
        current,
      });
      if (!twilioTo) {
        return NextResponse.json(
          { error: "No se pudo resolver destinatario WhatsApp técnico para entrega" },
          { status: 400 },
        );
      }

      try {
        const outbound = await twilioSendWhatsAppMessage({
          hotelId: user.hotelId,
          to: twilioTo,
          body: textToSend,
        });

        await updateMessageInAstra(user.hotelId, messageId, {
          approvedResponse: textToSend,
          status: "sent",
          respondedBy: respondedBy || user.email,
          deliveredAt: new Date().toISOString(),
          meta: {
            ...(current.meta || {}),
            twilioOutboundSid: outbound.sid ?? null,
          },
        });

        return NextResponse.json({ success: true, outboundSid: outbound.sid ?? null });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Twilio send failed",
          },
          { status: 502 },
        );
      }
    }

    const current = await getMessageById(messageId);
    if (!current || current.hotelId !== user.hotelId || current.channel !== channel) {
      return NextResponse.json(
        { error: "Mensaje no encontrado" },
        { status: 404 }
      );
    }

    await updateMessageInChannel(
      user.hotelId,
      channel,
      messageId,
      {
        ...(approvedResponse && { approvedResponse }),
        ...(status && { status }),
        ...(respondedBy && { respondedBy }),
      }
    );

    if (channel === "web" && current.conversationId && typeof approvedResponse === "string") {
      emitToConversation(current.conversationId, {
        type: "message",
        sender: "assistant",
        text: approvedResponse,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("⛔ Error en POST /api/messages:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
