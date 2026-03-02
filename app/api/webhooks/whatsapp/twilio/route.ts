// Path: /root/begasist/app/api/webhooks/whatsapp/twilio/route.ts
import { handleChannelMessage } from "@/lib/pipeline/handleChannelMessage";
import { twilioSendWhatsAppMessage } from "@/lib/channels/whatsapp/twilioSendMessage";

export async function POST(req: Request) {
  const form = await req.formData();
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

  try {
    const result = await handleChannelMessage({
      query: body,
      channel: "whatsapp",
      hotelId,
      conversationId: undefined,
      guestId: from,
      sourceMsgId: messageSid,
      sender: from,
    });
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
