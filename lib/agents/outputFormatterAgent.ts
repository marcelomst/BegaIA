// Path: /root/begasist/lib/agents/outputFormatterAgent.ts

export function buildPendingNotice(lang: string, _verdictInfo?: any): string {
    if (lang?.startsWith("es")) return "🕓 Tu consulta está siendo revisada por un recepcionista.";
    if (lang?.startsWith("pt")) return "🕓 Sua solicitação está sendo revisada por um recepcionista.";
    return "🕓 Your request is being reviewed by a receptionist.";
}
