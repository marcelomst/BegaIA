// Path: /root/begasist/lib/parsers/emailParser.ts

import { getLocalTime } from "@/lib/utils/time";
import { logToFile } from "@/lib/utils/debugLog";
import crypto from "crypto";
import type { ChannelMessage } from "@/types/channel";
import { simpleParser } from "mailparser";

export function extractSender(parsed: any, raw?: Buffer | string): string {
  if (parsed.from?.value?.[0]?.address) return parsed.from.value[0].address;
  if (parsed.from?.text?.includes("@")) return parsed.from.text;
  if (parsed.from?.value?.[0]?.name?.includes("@")) return parsed.from.value[0].name;

  if (parsed.headers?.get instanceof Function) {
    const fromHdr = parsed.headers.get("from");
    if (typeof fromHdr === "string" && fromHdr.includes("@")) {
      const match = fromHdr.match(/<([^>]+)>/) || fromHdr.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
      return match?.[1] || fromHdr.trim();
    }
  }

  if (Array.isArray(parsed.headerLines)) {
    for (const h of parsed.headerLines) {
      if (typeof h.line === "string" && h.line.includes("@")) {
        const match = h.line.match(/<([^>]+)>/) || h.line.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
        return match?.[1] || h.line.trim();
      }
    }
  }

  if (raw) {
    const rawStr = Buffer.isBuffer(raw) ? raw.toString("utf-8") : String(raw);
    const line = rawStr.split(/\r?\n/).find(l => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(l));
    return line?.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] || line?.trim() || "";
  }

  console.warn("⚠️ [emailParser] No se pudo extraer remitente");
  return "";
}

export async function extractAllTextFromParsed(parsed: any, raw?: Buffer | string): Promise<string> {
  const candidates: string[] = [];

  if (parsed.text?.trim()) candidates.push(parsed.text.trim());

  if (parsed.html?.trim()) {
    const htmlPlain = parsed.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    candidates.push(htmlPlain);
  }

  if (Array.isArray(parsed.headerLines)) {
    const headerPlain = parsed.headerLines.map((h: any) => h.line.trim()).filter(Boolean).join("\n");
    if (headerPlain) candidates.push(headerPlain);
  }

  if (Array.isArray(parsed.attachments)) {
    for (const att of parsed.attachments) {
      if (
        att.contentType === "text/plain" &&
        typeof att.content === "string" &&
        att.content.trim().length > 0
      ) {
        candidates.push(att.content.trim());
      }
    }
  }

  const emlAttachment = parsed.attachments?.find((att: any) =>
    att.contentType === "message/rfc822" || att.filename?.endsWith(".eml")
  );

  if (emlAttachment?.content) {
    try {
      const inner = await simpleParser(emlAttachment.content);
      if (inner.text?.trim()) candidates.push(inner.text.trim());
      if (inner.html?.trim()) {
        const innerHtml = inner.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        candidates.push(innerHtml);
      }
    } catch (err) {
      logToFile("warn", "[parseEmailToChannelMessage.emlParseError]", String(err));
    }
  }

  if (raw) {
    const rawStr = Buffer.isBuffer(raw) ? raw.toString("utf-8") : String(raw);
    const filtered = rawStr
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l && !/^enviado desde/i.test(l) && !/^sent from my/i.test(l));
    if (filtered.length > 0) candidates.push(filtered.join("\n"));
  }

  await logToFile("warn", "[parseEmailToChannelMessage.textCandidates]", candidates);

  const best = candidates
    .map(t => t.replace(/\s+/g, " ").trim())
    .filter(t => t.length > 3)
    .sort((a, b) => b.length - a.length)[0];

  return best || "";
}

export async function parseEmailToChannelMessage({
  imapMsg,
  parsed,
  hotelId,
  raw,
}: {
  imapMsg: any;
  parsed: any;
  hotelId: string;
  raw?: Buffer | string;
}): Promise<ChannelMessage> {
  await logToFile("warn", "[parseEmailToChannelMessage.parsed]", parsed);
  if (raw) await logToFile("warn", "[parseEmailToChannelMessage.raw]", raw.toString());

  const from = extractSender(parsed, raw);
  const to = parsed.to?.value?.[0]?.address || parsed.to?.text || "";
  const cc = parsed.cc?.value?.map((c: any) => c.address) ?? [];
  const bcc = parsed.bcc?.value?.map((c: any) => c.address) ?? [];

  const inReplyTo = parsed.inReplyTo || "";
  const references = Array.isArray(parsed.references)
    ? parsed.references
    : typeof parsed.references === "string"
    ? [parsed.references]
    : [];

  const subject = parsed.subject || parsed.headers?.get?.("subject") || "";

  const htmlRaw =
    typeof parsed.html === "string"
      ? parsed.html
      : Buffer.isBuffer(parsed.html)
      ? parsed.html.toString("utf-8")
      : "";

  const headerLines = Array.isArray(parsed.headerLines)
    ? parsed.headerLines.map((h: any) => h.line).join("\n").trim()
    : "";

  let content =
    parsed.text?.trim() ||
    htmlRaw.replace(/<[^>]+>/g, "").trim() ||
    headerLines;

  if (!content || content.length < 10) {
    content = await extractAllTextFromParsed(parsed, raw);
    await logToFile("warn", "[fallback.extractAllTextFromParsed]", content);
  }

  const timestamp = new Date().toISOString();
  const guestId = from;
  const conversationId = `${hotelId}-email-${guestId}`;

  const attachments = Array.isArray(parsed.attachments) ? parsed.attachments : [];
  const isForwarded = subject.toLowerCase().includes("fw:") || subject.toLowerCase().includes("fwd:");
  const originalMessageId = parsed.messageId || "";

  return {
    messageId: crypto.randomUUID(),
    conversationId,
    hotelId,
    channel: "email",
    sender: from,
    guestId,
    content,
    timestamp,
    time: await getLocalTime(hotelId, timestamp),
    suggestion: "",
    status: "pending",
    subject,
    recipient: to,
    cc,
    bcc,
    attachments,
    references,
    inReplyTo,
    originalMessageId,
    isForwarded,
    role: "user",
  };
}
