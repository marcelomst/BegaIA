// Path: /root/begasist/lib/utils/emailCleanup.ts

export function isProtonMail(email: string): boolean {
  return email.toLowerCase().includes("@proton.me") || email.toLowerCase().includes("@protonmail.com");
}

const QUOTED_REPLY_BOUNDARIES = [
  /^\s*On .+ wrote:\s*$/i,
  /^\s*On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\b.+/i,
  /^\s*El .+ escribi[oó]:\s*$/i,
  /^\s*El\s+(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?,?\b.+/i,
  /^\s*-----Original Message-----\s*$/i,
];

const INLINE_QUOTED_REPLY_BOUNDARIES = [
  /\s+On\s+(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?[\s\S]{0,240}?\bwrote:\s*$/i,
  /\s+El\s+(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?,?[\s\S]{0,240}?\bescribi[oó]:\s*$/i,
];

function stripInlineQuotedReplyBoundary(line: string): string {
  let boundaryIndex = -1;

  for (const pattern of INLINE_QUOTED_REPLY_BOUNDARIES) {
    const match = pattern.exec(line);
    if (!match || match.index < 0) continue;
    boundaryIndex = boundaryIndex === -1 ? match.index : Math.min(boundaryIndex, match.index);
  }

  return boundaryIndex >= 0 ? line.slice(0, boundaryIndex).trim() : line;
}

function stripQuotedThread(text: string): string[] {
  const rawLines = String(text || "").split(/\r?\n/);
  const kept: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (QUOTED_REPLY_BOUNDARIES.some((pattern) => pattern.test(trimmed))) break;
    if (kept.length > 0 && /^>+/.test(trimmed)) break;
    kept.push(stripInlineQuotedReplyBoundary(trimmed));
  }

  return kept;
}

export function standardCleanup(text: string): string {
  const lines = stripQuotedThread(text);

  const cleaned = lines.filter(line =>
    line &&
    !/^sent from my/i.test(line) &&
    !/^enviado desde/i.test(line) &&
    !/^envoyé de/i.test(line) &&
    !/^\s*-{2,}\s*$/.test(line)
  );

  return cleaned.join("\n").trim();
}
