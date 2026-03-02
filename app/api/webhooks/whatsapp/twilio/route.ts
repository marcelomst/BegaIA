// Path: /root/begasist/app/api/webhooks/whatsapp/twilio/route.ts
import { handleChannelMessage } from "@/lib/pipeline/handleChannelMessage";

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
