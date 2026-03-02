// Path: /root/begasist/app/api/webhooks/whatsapp/twilio/route.ts
export const runtime = "nodejs";
import { handleChannelMessage } from "@/lib/pipeline/handleChannelMessage";
import { twilioSendWhatsAppMessage } from "@/lib/channels/whatsapp/twilioSendMessage";
import { validateTwilioSignature } from "@/lib/channels/whatsapp/twilioValidateSignature";
import { hasInboundMessageBySourceMsgId } from "@/lib/db/messagesDedupe";
import { getConversationIdByGuestPhone } from "@/lib/db/conversationBinding";

export async function POST(req: Request) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    params[key] = typeof value === "string" ? value : String(value);
  }

  const sigHeader = req.headers.get("x-twilio-signature");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  const reqUrl = new URL(req.url);
  const urlForSig = forwardedProto && forwardedHost
    ? `${forwardedProto}://${forwardedHost}${reqUrl.pathname}${reqUrl.search}`
    : reqUrl.toString();
  const signatureEnforced = process.env.TWILIO_SIGNATURE_ENFORCE === "1";
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();

  if (signatureEnforced) {
    const isValid = Boolean(
      authToken &&
      sigHeader &&
      validateTwilioSignature({
        authToken,
        url: urlForSig,
        params,
        signatureHeader: sigHeader,
      }),
    );
    if (!isValid) {
      console.warn("[WA_TWILIO_SIGNATURE_INVALID]", {
        hasHeader: Boolean(sigHeader),
        hasAuthToken: Boolean(authToken),
        urlForSig,
        reqUrl: reqUrl.toString(),
      });
      return Response.json({ ok: false }, { status: 403 });
    }
  } else if (sigHeader && authToken) {
    const isValid = validateTwilioSignature({
      authToken,
      url: urlForSig,
      params,
      signatureHeader: sigHeader,
    });
    if (isValid) {
      console.log("[WA_TWILIO_SIGNATURE_OK]", { urlForSig });
    } else {
      console.warn("[WA_TWILIO_SIGNATURE_BAD_NON_ENFORCED]", {
        urlForSig,
        reqUrl: reqUrl.toString(),
      });
    }
  }

  const from = String(form.get("From") || "");
  const to = String(form.get("To") || "");
  const body = String(form.get("Body") || "");
  const messageSid = String(form.get("MessageSid") || "");

  const hotelId =
    to && process.env.TWILIO_WA_TO_HOTEL999 && to === process.env.TWILIO_WA_TO_HOTEL999
      ? "hotel999"
      : null;

  if (!hotelId) {
    console.warn("[WA_TWILIO_UNMAPPED_TO]", { to, from, messageSid });
    return Response.json({ ok: true }, { status: 200 });
  }

  if (messageSid) {
    const alreadyProcessed = await hasInboundMessageBySourceMsgId({
      hotelId,
      channel: "whatsapp",
      sourceMsgId: messageSid,
    });
    if (alreadyProcessed) {
      console.log("[WA_TWILIO_DEDUPED]", { hotelId, messageSid });
      return Response.json({ ok: true, deduped: true }, { status: 200 });
    }
  }

  try {
    let existingConversationId: string | null = null;
    try {
      existingConversationId = await getConversationIdByGuestPhone({
        hotelId,
        channel: "whatsapp",
        guestPhone: from,
      });
    } catch {
      existingConversationId = null;
    }

    const handlerInput: Parameters<typeof handleChannelMessage>[0] = {
      query: body,
      channel: "whatsapp",
      hotelId,
      guestId: from,
      sourceMsgId: messageSid,
      sender: from,
    };
    if (existingConversationId) {
      handlerInput.conversationId = existingConversationId;
    }

    const result = await handleChannelMessage(handlerInput);
    console.log("[WA_TWILIO_INBOUND]", {
      hotelId,
      to,
      from,
      messageId: result.messageId,
    });

    if (result.status === "pending") {
      console.log("[WA_TWILIO_PENDING]", {
        hotelId,
        to,
        from,
        messageSid,
      });
    }

    const shouldSendOutbound = result.status === "sent" && typeof result.response === "string" && result.response.trim().length > 0;
    if (shouldSendOutbound) {
      const twilioFrom = process.env.TWILIO_WHATSAPP_FROM?.trim();
      const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
      const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
      if (!twilioFrom || !accountSid || !authToken) {
        console.warn("[WA_TWILIO_OUTBOUND_SKIPPED_MISSING_ENV]", {
          hotelId,
          to,
          from,
          messageSid,
          hasFrom: Boolean(twilioFrom),
          hasAccountSid: Boolean(accountSid),
          hasAuthToken: Boolean(authToken),
        });
      } else {
        try {
          const outbound = await twilioSendWhatsAppMessage({
            to: from,
            from: twilioFrom,
            body: result.response,
          });
          console.log("[WA_TWILIO_OUTBOUND]", {
            hotelId,
            to: from,
            from: twilioFrom,
            messageSid,
            outboundSid: outbound.sid,
          });
        } catch (error) {
          console.warn("[WA_TWILIO_OUTBOUND_ERROR]", {
            hotelId,
            to: from,
            from: twilioFrom,
            messageSid,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }
  } catch (error) {
    console.warn("[WA_TWILIO_PIPELINE_ERROR]", {
      hotelId,
      to,
      from,
      messageSid,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return Response.json({ ok: true }, { status: 200 });
}
