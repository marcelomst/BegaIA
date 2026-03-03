// Path: /root/begasist/lib/channels/whatsapp/twilioSendMessage.ts
import { getTwilioClientForHotel } from "@/lib/channels/whatsapp/getTwilioClientForHotel";

export async function twilioSendWhatsAppMessage(input: {
  hotelId: string;
  to: string;
  body: string;
  fromOverride?: string;
}): Promise<{ sid?: string }> {
  const { client, from } = await getTwilioClientForHotel(input.hotelId);
  const accountSid = client.accountSid;
  const authToken = client.authToken;
  const fromToUse = input.fromOverride?.trim() || from;

  const form = new URLSearchParams();
  form.set("To", input.to);
  form.set("From", fromToUse);
  form.set("Body", input.body);
  if (process.env.TWILIO_STATUS_CALLBACK_URL?.trim()) {
    form.set("StatusCallback", process.env.TWILIO_STATUS_CALLBACK_URL.trim());
  }

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Twilio send failed (${res.status}): ${text.slice(0, 300)}`);
  }

  try {
    const json = JSON.parse(text) as { sid?: string };
    return { sid: json?.sid };
  } catch {
    return {};
  }
}
