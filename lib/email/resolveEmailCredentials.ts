// /lib/email/resolveEmailCredentials.ts
// Utilidad para unificar la resolución de credenciales SMTP evitando
// propagar password en claro y permitiendo usar referencias externas.

import type { EmailConfig } from "@/types/channel";

export type ResolvedEmailCredentials = {
    host: string;
    port: number;
    user: string;
    pass: string;
    secure?: boolean;
    source: "inline" | "env" | "none";
    reason?: string;
};

/** Nombre de flag global para habilitar envío real */
export const EMAIL_SENDING_ENABLED = process.env.EMAIL_SENDING_ENABLED === "true";

// Convención: variables de entorno para secretRef: EMAIL_PASS__<SECRET_REF>
export function emailSecretEnvVarName(ref: string) {
    return `EMAIL_PASS__${ref.replace(/[^A-Za-z0-9_]/g, "_").toUpperCase()}`;
}

/**
 * Resuelve credenciales priorizando:
 * 1. secretRef -> process.env[EMAIL_PASS__REF]
 * 2. password inline (legacy)
 * Si no existe password, retorna source:"none" con reason.
 */
export function resolveEmailCredentials(email: EmailConfig | undefined): ResolvedEmailCredentials | undefined {
    if (!email) return undefined;

    const base = {
        host: email.smtpHost,
        port: email.smtpPort,
        user: email.dirEmail,
        secure: email.secure,
    };

    if (email.secretRef) {
        const varName = emailSecretEnvVarName(email.secretRef);
        const pass = process.env[varName];
        if (pass) {
            return { ...base, pass, source: "env" };
        }
        // fallback a inline si existe, para transición
        if (email.password) {
            return { ...base, pass: email.password, source: "inline", reason: `secretRef ${varName} ausente, usando inline legacy` };
        }
        return { ...base, pass: "", source: "none", reason: `No se encontró variable ${varName} ni password inline` };
    }

    if (email.password) {
        return { ...base, pass: email.password, source: "inline" };
    }

    return { ...base, pass: "", source: "none", reason: "Faltan credenciales (ni secretRef ni password)" };
}
