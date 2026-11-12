// Path: /lib/infra/trustedIngress.ts

import crypto from "node:crypto";
import { promises as dns } from "node:dns";
import http, {
  type IncomingHttpHeaders,
  type IncomingMessage,
  type RequestOptions,
  type ServerResponse,
} from "node:http";
import { isIP } from "node:net";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const MIN_PROXY_SECRET_BYTES = 32;
const DEFAULT_LOCAL_PORT = 3000;
const DEFAULT_TUNNEL_PORT = 3001;
const HEALTH_PATH = "/__trusted-ingress/health";
const CLIENT_IP_HEADER = "x-begasist-client-ip";
const TIMESTAMP_HEADER = "x-begasist-proxy-timestamp";
const SIGNATURE_HEADER = "x-begasist-proxy-signature";
const HTTP_TOKEN = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const UNTRUSTED_ADDRESS_HEADERS = new Set([
  "cf-connecting-ip",
  "true-client-ip",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-port",
  "x-forwarded-proto",
  "x-real-ip",
]);
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
const RECONSTRUCTED_HEADERS = new Set([
  "host",
  "x-forwarded-host",
  "x-forwarded-proto",
  CLIENT_IP_HEADER,
  TIMESTAMP_HEADER,
  SIGNATURE_HEADER,
]);

export type TrustedIngressMode = "local" | "tunnel";

export type TrustedIngressConfig = {
  upstream: URL;
  proxyTrustSecret: string;
  localPort: number;
  localPeerAddress: string;
  tunnelPort: number;
  localBindAddress: string;
  tunnelBindAddress: string;
  tunnelPeerHost: string;
};

type ForwardContext = {
  upstream: URL;
  headers: IncomingHttpHeaders;
};

export type TrustedIngressForwarder = (
  req: IncomingMessage,
  res: ServerResponse,
  context: ForwardContext,
) => void | Promise<void>;

type TrustedIngressDependencies = {
  now?: () => number;
  resolvePeerAddresses?: (hostname: string) => Promise<string[]>;
  forward?: TrustedIngressForwarder;
  createAssertion?: typeof createProxyAssertion;
};

function positivePort(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : fallback;
}

function normalizeAddress(value: string | undefined): string {
  const address = String(value ?? "").trim();
  return address.startsWith("::ffff:") ? address.slice(7) : address;
}

function safeTunnelPeerHost(value: string | undefined): string {
  const hostname = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname) || isIP(hostname) !== 0) {
    throw new Error("Trusted ingress tunnel peer host is invalid");
  }
  return hostname;
}

function requiredIp(value: string | undefined, label: string): string {
  const address = normalizeAddress(value);
  if (isIP(address) === 0) throw new Error(`Trusted ingress ${label} is invalid`);
  return address;
}

export function loadTrustedIngressConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): TrustedIngressConfig {
  const proxyTrustSecret = String(env.GUEST_WEB_PROXY_TRUST_SECRET ?? "");
  if (!proxyTrustSecret.trim() || Buffer.byteLength(proxyTrustSecret, "utf8") < MIN_PROXY_SECRET_BYTES) {
    throw new Error("Trusted ingress proxy secret is not configured");
  }
  const upstream = new URL(String(env.TRUSTED_INGRESS_UPSTREAM ?? "http://suite:3000"));
  if (upstream.protocol !== "http:" || upstream.username || upstream.password || upstream.pathname !== "/") {
    throw new Error("Trusted ingress upstream must be an internal HTTP origin");
  }
  return {
    upstream,
    proxyTrustSecret,
    localPort: positivePort(env.TRUSTED_INGRESS_LOCAL_PORT, DEFAULT_LOCAL_PORT),
    localPeerAddress: requiredIp(
      env.TRUSTED_INGRESS_LOCAL_PEER_ADDRESS ?? "172.30.253.1",
      "local peer address",
    ),
    tunnelPort: positivePort(env.TRUSTED_INGRESS_TUNNEL_PORT, DEFAULT_TUNNEL_PORT),
    localBindAddress: requiredIp(
      env.TRUSTED_INGRESS_LOCAL_BIND_ADDRESS ?? "0.0.0.0",
      "local bind address",
    ),
    tunnelBindAddress: requiredIp(
      env.TRUSTED_INGRESS_TUNNEL_BIND_ADDRESS ?? "0.0.0.0",
      "tunnel bind address",
    ),
    tunnelPeerHost: safeTunnelPeerHost(env.TRUSTED_INGRESS_TUNNEL_PEER_HOST ?? "cloudflared"),
  };
}

export function createProxyAssertion(
  clientAddress: string,
  proxyTrustSecret: string,
  nowMs = Date.now(),
): Record<string, string> {
  if (isIP(clientAddress) === 0) throw new Error("Trusted ingress client address is invalid");
  const timestamp = String(Math.floor(nowMs / 1000));
  if (!/^\d{10}$/.test(timestamp)) throw new Error("Trusted ingress timestamp is invalid");
  const signature = crypto
    .createHmac("sha256", proxyTrustSecret)
    .update(`v1\n${timestamp}\n${clientAddress}`, "utf8")
    .digest("hex");
  return {
    [CLIENT_IP_HEADER]: clientAddress,
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: signature,
  };
}

export function sanitizedForwardHeaders(
  source: IncomingHttpHeaders,
  assertion: Record<string, string>,
): IncomingHttpHeaders {
  const connectionTokens = connectionHeaderTokens(source);
  if ([...connectionTokens].some((name) => RECONSTRUCTED_HEADERS.has(name))) {
    throw new Error("Connection nominates a protected forwarding header");
  }
  const headers: IncomingHttpHeaders = {};
  for (const [rawName, value] of Object.entries(source)) {
    const name = rawName.toLowerCase();
    if (
      name.startsWith("x-begasist-") ||
      UNTRUSTED_ADDRESS_HEADERS.has(name) ||
      HOP_BY_HOP_HEADERS.has(name) ||
      connectionTokens.has(name) ||
      typeof value === "undefined"
    ) continue;
    headers[name] = value;
  }
  Object.assign(headers, assertion);
  return headers;
}

export function connectionHeaderTokens(headers: IncomingHttpHeaders): Set<string> {
  const values = Object.entries(headers)
    .filter(([name]) => name.toLowerCase() === "connection")
    .flatMap(([, value]) => Array.isArray(value) ? value : typeof value === "string" ? [value] : []);
  const tokens = new Set<string>();
  for (const value of values) {
    for (const rawToken of value.split(",")) {
      const token = rawToken.trim().toLowerCase();
      if (!token || !HTTP_TOKEN.test(token)) {
        throw new Error("Connection header contains an invalid token");
      }
      tokens.add(token);
    }
  }
  return tokens;
}

async function defaultResolvePeerAddresses(hostname: string): Promise<string[]> {
  return (await dns.lookup(hostname, { all: true, verbatim: true }))
    .map((entry) => normalizeAddress(entry.address));
}

async function trustedClientAddress(
  mode: TrustedIngressMode,
  req: IncomingMessage,
  config: TrustedIngressConfig,
  resolvePeerAddresses: (hostname: string) => Promise<string[]>,
): Promise<string> {
  if (mode === "local") {
    const peerAddress = normalizeAddress(req.socket.remoteAddress);
    if (!peerAddress || peerAddress !== normalizeAddress(config.localPeerAddress)) {
      throw new Error("Trusted ingress local peer is not accredited");
    }
    return "127.0.0.1";
  }

  const peerAddress = normalizeAddress(req.socket.remoteAddress);
  const allowedPeers = (await resolvePeerAddresses(config.tunnelPeerHost)).map(normalizeAddress);
  if (!peerAddress || !allowedPeers.includes(peerAddress)) {
    throw new Error("Trusted ingress tunnel peer is not accredited");
  }
  const forwardedAddress = req.headers["cf-connecting-ip"];
  if (typeof forwardedAddress !== "string" || isIP(forwardedAddress.trim()) === 0) {
    throw new Error("Trusted ingress client address is not accredited");
  }
  return forwardedAddress.trim();
}

function requestPath(rawUrl: string | undefined): string {
  const parsed = new URL(rawUrl || "/", "http://trusted-ingress.invalid");
  return `${parsed.pathname}${parsed.search}`;
}

export function sanitizedResponseHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
  const connectionTokens = connectionHeaderTokens(headers);
  return Object.fromEntries(Object.entries(headers).filter(([rawName]) => {
    const name = rawName.toLowerCase();
    return !HOP_BY_HOP_HEADERS.has(name) && !connectionTokens.has(name);
  }));
}

export const forwardTrustedIngressRequest: TrustedIngressForwarder = (req, res, context) => {
  const path = requestPath(req.url);
  const options: RequestOptions = {
    protocol: context.upstream.protocol,
    hostname: context.upstream.hostname,
    port: context.upstream.port || 80,
    method: req.method,
    path,
    headers: context.headers.host
      ? context.headers
      : { ...context.headers, host: context.upstream.host },
  };
  const upstreamRequest = http.request(options, (upstreamResponse) => {
    let headers: IncomingHttpHeaders;
    try {
      headers = sanitizedResponseHeaders(upstreamResponse.headers);
    } catch {
      upstreamResponse.resume();
      res.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
      res.end('{"ok":false,"error":"Trusted ingress upstream response invalid"}');
      return;
    }
    res.writeHead(
      upstreamResponse.statusCode ?? 502,
      upstreamResponse.statusMessage,
      headers,
    );
    upstreamResponse.pipe(res);
  });
  upstreamRequest.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(502, { "content-type": "application/json", "cache-control": "no-store" });
    }
    res.end('{"ok":false,"error":"Trusted ingress upstream unavailable"}');
  });
  req.on("aborted", () => upstreamRequest.destroy());
  req.pipe(upstreamRequest);
};

function unavailable(res: ServerResponse): void {
  if (!res.headersSent) {
    res.writeHead(503, { "content-type": "application/json", "cache-control": "no-store" });
  }
  res.end('{"ok":false,"error":"Trusted ingress client identity unavailable"}');
}

export function createTrustedIngressHandler(
  mode: TrustedIngressMode,
  config: TrustedIngressConfig,
  dependencies: TrustedIngressDependencies = {},
): (req: IncomingMessage, res: ServerResponse) => void {
  const now = dependencies.now ?? Date.now;
  const resolvePeerAddresses = dependencies.resolvePeerAddresses ?? defaultResolvePeerAddresses;
  const forward = dependencies.forward ?? forwardTrustedIngressRequest;
  const createAssertion = dependencies.createAssertion ?? createProxyAssertion;
  return (req, res) => {
    void (async () => {
      if (requestPath(req.url) === HEALTH_PATH) {
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end('{"ok":true}');
        return;
      }
      try {
        const address = await trustedClientAddress(mode, req, config, resolvePeerAddresses);
        const assertion = createAssertion(address, config.proxyTrustSecret, now());
        const headers = sanitizedForwardHeaders(req.headers, assertion);
        const originalHost = typeof req.headers.host === "string" && req.headers.host.trim()
          ? req.headers.host.trim()
          : config.upstream.host;
        headers.host = originalHost;
        headers["x-forwarded-host"] = originalHost;
        headers["x-forwarded-proto"] = mode === "tunnel" ? "https" : "http";
        await forward(req, res, { upstream: config.upstream, headers });
      } catch {
        unavailable(res);
      }
    })();
  };
}

export async function startTrustedIngress(config = loadTrustedIngressConfig()): Promise<void> {
  const localServer = http.createServer(createTrustedIngressHandler("local", config));
  const tunnelServer = http.createServer(createTrustedIngressHandler("tunnel", config));
  try {
    await Promise.all([
      new Promise<void>((resolveListen, reject) => {
        localServer.once("error", reject);
        localServer.listen(config.localPort, config.localBindAddress, resolveListen);
      }),
      new Promise<void>((resolveListen, reject) => {
        tunnelServer.once("error", reject);
        tunnelServer.listen(config.tunnelPort, config.tunnelBindAddress, resolveListen);
      }),
    ]);
  } catch (error) {
    if (localServer.listening) localServer.close();
    if (tunnelServer.listening) tunnelServer.close();
    throw error;
  }
  console.log("[trusted-ingress] local and tunnel listeners ready");

  const shutdown = () => {
    localServer.close();
    tunnelServer.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath && invokedPath === resolve(fileURLToPath(import.meta.url))) {
  void startTrustedIngress().catch(() => {
    console.error("[trusted-ingress] startup failed");
    process.exitCode = 1;
  });
}
