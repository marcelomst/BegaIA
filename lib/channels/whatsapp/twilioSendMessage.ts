// Path: /root/begasist/lib/channels/whatsapp/twilioSendMessage.ts
export async function twilioSendWhatsAppMessage(input: {
  to: string;
  from: string;
  body: string;
}): Promise<{ sid?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials (TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN)");
  }

  const form = new URLSearchParams();
  form.set("To", input.to);
  form.set("From", input.from);
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
