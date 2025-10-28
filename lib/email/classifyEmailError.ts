/**
 * Clasifica mensajes de error de envío de email para decidir estrategia.
 */
export interface EmailErrorClassification {
    type: 'config' | 'quota' | 'transient';
    isNotConfigured: boolean;
    isQuota: boolean;
    raw: string;
}

export function classifyEmailError(raw: string | undefined | null): EmailErrorClassification {
    const msg = (raw || '').toLowerCase();
    const isNotConfigured = /not configured|smtphost|missing smtp|no smtp|invalid login|username and password not accepted|535-5\.7\.8/i.test(msg);
    // Gmail / general quota patterns
    const isQuota = /daily user sending limit exceeded|quota|rate limit/i.test(msg);
    let type: EmailErrorClassification['type'] = 'transient';
    if (isNotConfigured) type = 'config';
    else if (isQuota) type = 'quota';
    return { type, isNotConfigured, isQuota, raw: raw || '' };
}
