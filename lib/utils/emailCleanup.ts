// Path: /root/begasist/lib/utils/emailCleanup.ts

export function isProtonMail(email: string): boolean {
  return email.toLowerCase().includes("@proton.me") || email.toLowerCase().includes("@protonmail.com");
}

const QUOTED_REPLY_BOUNDARIES = [
  /^\s*On .+ wrote:\s*$/i,
  /^\s*El .+ escribi[oó]:\s*$/i,
  /^\s*-----Original Message-----\s*$/i,
];

function stripQuotedThread(text: string): string[] {
  const rawLines = String(text || "").split(/\r?\n/);
  const kept: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (QUOTED_REPLY_BOUNDARIES.some((pattern) => pattern.test(trimmed))) break;
    if (kept.length > 0 && /^>+/.test(trimmed)) break;
    kept.push(trimmed);
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
