// Path: /root/begasist/lib/channels/whatsapp/twilioValidateSignature.ts
import crypto from "crypto";

export function validateTwilioSignature(input: {
  authToken: string;
  url: string;
  params: Record<string, string>;
  signatureHeader: string | null;
}): boolean {
  const { authToken, url, params, signatureHeader } = input;
  if (!signatureHeader) return false;

  const sortedKeys = Object.keys(params).sort((a, b) => a.localeCompare(b));
  const data = sortedKeys.reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto.createHmac("sha1", authToken).update(data).digest("base64");
  const actual = signatureHeader.trim();

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(actual);
  if (expectedBuf.length !== actualBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
