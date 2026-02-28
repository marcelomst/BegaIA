// Path: /root/begasist/app/api/webhooks/whatsapp/twilio/route.ts
import type { ChannelMessage } from "@/types/channel";

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

  const normalized: ChannelMessage = {
    messageId: `twilio:${messageSid}`,
    hotelId,
    channel: "whatsapp",
    sender: from,
    content: body ?? "",
    timestamp: new Date().toISOString(),
    role: "user",
    direction: "in",
    sourceProvider: "whatsapp.twilio",
    sourceMsgId: messageSid,
    meta: {
      to,
      from,
      twilio: { messageSid },
    },
  };

  console.log("[WA_TWILIO_INBOUND]", {
    hotelId,
    to,
    from,
    messageId: normalized.messageId,
  });

  return Response.json({ ok: true }, { status: 200 });
}

