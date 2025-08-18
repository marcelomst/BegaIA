// Path: /root/begasist/lib/agents/tools/mcpReservationsTool.ts
export type McpClientOptions = {
  endpoint?: string; // default: /api/mcp
  apiKey?: string;   // optional
};

async function callMcp(name: string, params: Record<string, any>, opts?: McpClientOptions) {
  const endpoint = opts?.endpoint ?? "/api/mcp";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts?.apiKey) headers["x-mcp-key"] = opts.apiKey;

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ action: "call", name, params }),
  });

  if (!res.ok) throw new Error(`MCP HTTP ${res.status}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "MCP call failed");
  return json.data;
}

// Ejemplos de wrappers
export const mcpSearchAvailability = (params: any, opts?: McpClientOptions) =>
  callMcp("searchAvailability", params, opts);
export const mcpCreateReservation = (params: any, opts?: McpClientOptions) =>
  callMcp("createReservation", params, opts);
export const mcpCancelReservation = (params: any, opts?: McpClientOptions) =>
  callMcp("cancelReservation", params, opts);
export const mcpGetReservation = (params: any, opts?: McpClientOptions) =>
  callMcp("getReservation", params, opts);
export const mcpListReservations = (params: any, opts?: McpClientOptions) =>
  callMcp("listReservations", params, opts);
