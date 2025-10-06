// Path: /root/begasist/lib/agents/tools/mcpReservationsTool.ts
export type McpClientOptions = {
  endpoint?: string; // default: /api/mcp
  apiKey?: string;   // optional
};

async function callMcp<TParams extends Record<string, unknown>, TResult = unknown>(
  name: string,
  params: TParams,
  opts?: McpClientOptions
) {
  const endpoint = opts?.endpoint ?? "/api/mcp";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.apiKey) headers["x-mcp-key"] = opts.apiKey;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "call", name, params }),
  });

  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const json: unknown = await res.json();
  const j = json as { ok?: boolean; error?: string; data?: TResult };
  if (!j?.ok) throw new Error(j?.error || "MCP call failed");
  return j.data as TResult;
}

// Ejemplos de wrappers
export const mcpSearchAvailability = <TParams extends Record<string, unknown>, TResult = unknown>(
  params: TParams,
  opts?: McpClientOptions
) => callMcp<TParams, TResult>("searchAvailability", params, opts);
export const mcpCreateReservation = <TParams extends Record<string, unknown>, TResult = unknown>(
  params: TParams,
  opts?: McpClientOptions
) => callMcp<TParams, TResult>("createReservation", params, opts);
export const mcpCancelReservation = <TParams extends Record<string, unknown>, TResult = unknown>(
  params: TParams,
  opts?: McpClientOptions
) => callMcp<TParams, TResult>("cancelReservation", params, opts);
export const mcpGetReservation = <TParams extends Record<string, unknown>, TResult = unknown>(
  params: TParams,
  opts?: McpClientOptions
) => callMcp<TParams, TResult>("getReservation", params, opts);
export const mcpListReservations = <TParams extends Record<string, unknown>, TResult = unknown>(
  params: TParams,
  opts?: McpClientOptions
) => callMcp<TParams, TResult>("listReservations", params, opts);
