// Path: /root/begasist/lib/utils/emailCleanup.ts

export function isProtonMail(email: string): boolean {
  return email.toLowerCase().includes("@proton.me") || email.toLowerCase().includes("@protonmail.com");
}

export function standardCleanup(text: string): string {
  const lines = text.split(/\r?\n/).map(l => l.trim());

  const cleaned = lines.filter(line =>
    line &&
    !/^sent from my/i.test(line) &&
    !/^enviado desde/i.test(line) &&
    !/^envoyé de/i.test(line) &&
    !/^\s*-{2,}\s*$/.test(line) && // líneas tipo "----"
    !/^\s*On .* wrote:$/i.test(line) // citas comunes
  );

  return cleaned.join("\n").trim();
}
