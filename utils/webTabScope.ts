// Path: /home/marcelo/begasist/utils/webTabScope.ts

const TAB_SCOPE_PREFIX = "begasist:web-tab:";

function buildScopeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getWebTabScopeId(): string {
  if (typeof window === "undefined") return "server";
  const current = String(window.name || "").trim();
  if (current.startsWith(TAB_SCOPE_PREFIX)) {
    return current.slice(TAB_SCOPE_PREFIX.length);
  }
  const next = buildScopeId();
  window.name = `${TAB_SCOPE_PREFIX}${next}`;
  return next;
}

export function getScopedSessionKey(baseKey: string): string {
  return `${baseKey}:${getWebTabScopeId()}`;
}
