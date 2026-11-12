// Path: /test/unit/trustedIngress.spec.ts

import crypto from "node:crypto";
import { PassThrough } from "node:stream";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import http, { type ClientRequest, type IncomingMessage, type ServerResponse } from "node:http";

import {
  createProxyAssertion,
  createTrustedIngressHandler,
  forwardTrustedIngressRequest,
  loadTrustedIngressConfig,
  sanitizedForwardHeaders,
  sanitizedResponseHeaders,
  type TrustedIngressConfig,
  type TrustedIngressForwarder,
} from "@/lib/infra/trustedIngress";

const PROXY_SECRET = "trusted-ingress-test-secret-with-at-least-32-bytes";

function config(): TrustedIngressConfig {
  return {
    upstream: new URL("http://suite:3000"),
    proxyTrustSecret: PROXY_SECRET,
    localPort: 3000,
    localPeerAddress: "172.30.253.1",
    tunnelPort: 3001,
    localBindAddress: "172.30.253.2",
    tunnelBindAddress: "172.30.254.2",
    tunnelPeerHost: "cloudflared",
  };
}

function request(input: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  remoteAddress?: string | null;
  body?: string;
} = {}): IncomingMessage {
  const stream = new PassThrough() as PassThrough & Partial<IncomingMessage>;
  Object.defineProperties(stream, {
    method: { value: input.method ?? "GET", configurable: true },
    url: { value: input.url ?? "/", configurable: true },
    headers: { value: input.headers ?? {}, configurable: true },
    socket: {
      value: { remoteAddress: input.remoteAddress === null ? undefined : input.remoteAddress ?? "172.30.0.2" },
      configurable: true,
    },
  });
  stream.end(input.body ?? "");
  return stream as IncomingMessage;
}

function response() {
  let status = 0;
  let body = "";
  let headersSent = false;
  const res = {
    get headersSent() { return headersSent; },
    writeHead: vi.fn((nextStatus: number) => {
      status = nextStatus;
      headersSent = true;
      return res;
    }),
    end: vi.fn((chunk?: string) => { body += chunk ?? ""; }),
  } as unknown as ServerResponse;
  return { res, status: () => status, body: () => body };
}

describe("demo trusted ingress", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("creates the exact v1 HMAC assertion with a Unix timestamp", () => {
    const assertion = createProxyAssertion("203.0.113.25", PROXY_SECRET, 1_799_999_999_000);
    const expected = crypto
      .createHmac("sha256", PROXY_SECRET)
      .update("v1\n1799999999\n203.0.113.25", "utf8")
      .digest("hex");

    expect(assertion).toEqual({
      "x-begasist-client-ip": "203.0.113.25",
      "x-begasist-proxy-timestamp": "1799999999",
      "x-begasist-proxy-signature": expected,
    });
    expect(`0${expected.slice(1)}`).not.toBe(expected);
  });

  it("removes caller x-begasist and forwarding headers before injecting its own assertion", () => {
    const headers = sanitizedForwardHeaders({
      authorization: "Bearer opaque-capability",
      "content-type": "application/json",
      "x-begasist-client-ip": "198.51.100.1",
      "X-Begasist-Proxy-Signature": "attacker",
      "cf-connecting-ip": "198.51.100.2",
      "x-forwarded-for": "198.51.100.3",
      "x-real-ip": "198.51.100.4",
    }, createProxyAssertion("127.0.0.1", PROXY_SECRET, 1_799_999_999_000));

    expect(headers.authorization).toBe("Bearer opaque-capability");
    expect(headers["content-type"]).toBe("application/json");
    expect(headers["x-begasist-client-ip"]).toBe("127.0.0.1");
    expect(headers["cf-connecting-ip"]).toBeUndefined();
    expect(headers["x-forwarded-for"]).toBeUndefined();
    expect(headers["x-real-ip"]).toBeUndefined();
  });

  it("accepts CF-Connecting-IP only from the accredited cloudflared TCP peer", async () => {
    let forwardedHeaders: Record<string, unknown> | null = null;
    const forwarded = new Promise<void>((resolveForwarded) => {
      const forward: TrustedIngressForwarder = (_req, res, context) => {
        forwardedHeaders = context.headers;
        res.writeHead(204);
        res.end();
        resolveForwarded();
      };
      createTrustedIngressHandler("tunnel", config(), {
        now: () => 1_799_999_999_000,
        resolvePeerAddresses: async () => ["172.30.0.2"],
        forward,
      })(request({
        headers: {
          host: "wa-dev.begam.uy",
          "cf-connecting-ip": "203.0.113.90",
          "x-forwarded-host": "caller.invalid",
          "x-forwarded-proto": "http",
        },
        remoteAddress: "::ffff:172.30.0.2",
      }), response().res);
    });
    await forwarded;

    expect(forwardedHeaders).toMatchObject({
      "x-begasist-client-ip": "203.0.113.90",
      "x-begasist-proxy-timestamp": "1799999999",
      host: "wa-dev.begam.uy",
      "x-forwarded-host": "wa-dev.begam.uy",
      "x-forwarded-proto": "https",
    });
  });

  it.each([
    ["untrusted peer", "172.30.0.99", "203.0.113.90"],
    ["missing client IP", "172.30.0.2", ""],
    ["invalid client IP", "172.30.0.2", "caller-controlled"],
  ])("fails closed for %s", async (_label, remoteAddress, clientAddress) => {
    const forward = vi.fn();
    const output = response();
    createTrustedIngressHandler("tunnel", config(), {
      resolvePeerAddresses: async () => ["172.30.0.2"],
      forward,
    })(request({
      headers: clientAddress ? { "cf-connecting-ip": clientAddress } : {},
      remoteAddress,
    }), output.res);

    await vi.waitFor(() => expect(output.status()).toBe(503));
    expect(forward).not.toHaveBeenCalled();
    expect(output.body()).not.toContain(remoteAddress);
  });

  it.each(["172.30.253.1", "::ffff:172.30.253.1"])(
    "uses one local principal only for the accredited peer %s",
    async (remoteAddress) => {
    let forwardedHeaders: Record<string, unknown> = {};
    const forwarded = new Promise<void>((resolveForwarded) => {
      createTrustedIngressHandler("local", config(), {
        now: () => 1_799_999_999_000,
        forward: (_req, res, context) => {
          forwardedHeaders = context.headers;
          res.writeHead(204);
          res.end();
          resolveForwarded();
        },
      })(request({
        headers: {
          "cf-connecting-ip": "203.0.113.1",
          "x-forwarded-for": "203.0.113.2",
          "x-forwarded-host": "caller.invalid",
          "x-forwarded-proto": "https",
          "x-begasist-client-ip": "203.0.113.3",
          host: "127.0.0.1:3000",
        },
        remoteAddress,
      }), response().res);
    });
    await forwarded;
    expect(forwardedHeaders).toMatchObject({
      "x-begasist-client-ip": "127.0.0.1",
      host: "127.0.0.1:3000",
      "x-forwarded-host": "127.0.0.1:3000",
      "x-forwarded-proto": "http",
    });
    },
  );

  it.each([
    ["app-backend peer", "172.30.250.7"],
    ["tunnel-ingress peer", "172.30.254.20"],
    ["cloudflared on local listener", "172.30.254.3"],
    ["IPv4-mapped unauthorized peer", "::ffff:172.30.250.7"],
    ["unidentified peer", null],
  ])("rejects %s before creating a local HMAC assertion", async (_label, remoteAddress) => {
    const createAssertion = vi.fn(createProxyAssertion);
    const forward = vi.fn();
    const output = response();
    createTrustedIngressHandler("local", config(), {
      createAssertion,
      forward,
    })(request({
      headers: {
        host: "127.0.0.1:3000",
        "cf-connecting-ip": "127.0.0.1",
        "x-forwarded-for": "127.0.0.1",
        "x-begasist-client-ip": "127.0.0.1",
      },
      remoteAddress,
    }), output.res);

    await vi.waitFor(() => expect(output.status()).toBe(503));
    expect(createAssertion).not.toHaveBeenCalled();
    expect(forward).not.toHaveBeenCalled();
  });

  it("removes Connection-nominated and standard hop-by-hop request headers", () => {
    const headers = sanitizedForwardHeaders({
      CoNnEcTiOn: "X-Example, KEEP-ALIVE, Te",
      "X-Example": "remove-me",
      "keep-alive": "timeout=5",
      te: "trailers",
      upgrade: "websocket",
      "proxy-connection": "keep-alive",
      authorization: "Bearer opaque",
      cookie: "session=end-to-end",
      "content-type": "application/json",
    }, createProxyAssertion("127.0.0.1", PROXY_SECRET, 1_799_999_999_000));

    expect(headers["x-example"]).toBeUndefined();
    expect(headers["keep-alive"]).toBeUndefined();
    expect(headers.te).toBeUndefined();
    expect(headers.upgrade).toBeUndefined();
    expect(headers["proxy-connection"]).toBeUndefined();
    expect(headers.authorization).toBe("Bearer opaque");
    expect(headers.cookie).toBe("session=end-to-end");
    expect(headers["content-type"]).toBe("application/json");
  });

  it("fails closed for malformed or protected Connection tokens", () => {
    expect(() => sanitizedForwardHeaders({
      connection: "x-example,,keep-alive",
      "x-example": "remove-me",
    }, createProxyAssertion("127.0.0.1", PROXY_SECRET))).toThrow(/invalid token/);

    expect(() => sanitizedForwardHeaders({
      connection: "x-forwarded-host",
      "x-forwarded-host": "caller.invalid",
    }, createProxyAssertion("127.0.0.1", PROXY_SECRET))).toThrow(/protected forwarding header/);
  });

  it("removes Connection-nominated response headers and preserves end-to-end headers", () => {
    const headers = sanitizedResponseHeaders({
      Connection: "X-Origin-Internal, keep-alive",
      "X-Origin-Internal": "remove-me",
      "Keep-Alive": "timeout=5",
      "Set-Cookie": ["a=1; HttpOnly", "b=2; Secure"],
      "Content-Type": "application/json",
      etag: '"end-to-end"',
    });

    expect(headers["X-Origin-Internal"]).toBeUndefined();
    expect(headers["Keep-Alive"]).toBeUndefined();
    expect(headers["Set-Cookie"]).toEqual(["a=1; HttpOnly", "b=2; Secure"]);
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers.etag).toBe('"end-to-end"');
  });

  it("fails closed for an ambiguous upstream Connection header", () => {
    expect(() => sanitizedResponseHeaders({
      connection: "x-origin,,keep-alive",
      "x-origin": "remove-me",
    })).toThrow(/invalid token/);
  });

  it("streams request and response bodies while sanitizing upstream response headers", async () => {
    const upstreamRequest = new PassThrough() as PassThrough & Partial<ClientRequest>;
    const upstreamResponse = new PassThrough() as PassThrough & Partial<IncomingMessage>;
    Object.defineProperties(upstreamResponse, {
      statusCode: { value: 201, configurable: true },
      statusMessage: { value: "Created", configurable: true },
      headers: {
        value: {
          connection: "x-origin-internal, keep-alive",
          "x-origin-internal": "remove-me",
          "keep-alive": "timeout=5",
          "set-cookie": ["session=opaque; HttpOnly"],
          "content-type": "application/json",
        },
        configurable: true,
      },
    });
    let options: unknown;
    vi.spyOn(http, "request").mockImplementation(((nextOptions, callback) => {
      options = nextOptions;
      const responseCallback = typeof callback === "function" ? callback : undefined;
      queueMicrotask(() => {
        responseCallback?.(upstreamResponse as IncomingMessage);
        upstreamResponse.end('{"ok":true}');
      });
      return upstreamRequest as ClientRequest;
    }) as typeof http.request);

    const requestChunks: Buffer[] = [];
    upstreamRequest.on("data", (chunk) => requestChunks.push(Buffer.from(chunk)));
    const downstream = new PassThrough() as PassThrough & Partial<ServerResponse>;
    const responseChunks: Buffer[] = [];
    downstream.on("data", (chunk) => responseChunks.push(Buffer.from(chunk)));
    const writeHead = vi.fn(() => downstream as unknown as ServerResponse);
    Object.defineProperties(downstream, {
      writeHead: { value: writeHead, configurable: true },
      headersSent: { value: false, writable: true, configurable: true },
    });
    const requestFinished = new Promise<void>((resolveFinished) => upstreamRequest.on("finish", resolveFinished));
    const responseFinished = new Promise<void>((resolveFinished) => downstream.on("finish", resolveFinished));

    forwardTrustedIngressRequest(
      request({ method: "POST", url: "/api/chat?source=stream", body: '{"query":"Hola"}' }),
      downstream as unknown as ServerResponse,
      {
        upstream: new URL("http://suite:3000"),
        headers: { host: "127.0.0.1:3000", "content-type": "application/json" },
      },
    );
    await Promise.all([requestFinished, responseFinished]);

    expect(options).toMatchObject({ method: "POST", path: "/api/chat?source=stream" });
    expect(Buffer.concat(requestChunks).toString("utf8")).toBe('{"query":"Hola"}');
    expect(Buffer.concat(responseChunks).toString("utf8")).toBe('{"ok":true}');
    expect(writeHead).toHaveBeenCalledWith(201, "Created", {
      "set-cookie": ["session=opaque; HttpOnly"],
      "content-type": "application/json",
    });
  });

  it.each([
    ["POST", "/api/guest/web/bootstrap?source=demo", '{"hotelId":"hotel999"}'],
    ["GET", "/admin?hotelId=hotel999", ""],
    ["POST", "/api/webhooks/whatsapp/twilio?signature=test", "Body=opaque"],
  ])("preserves %s method, route, query and body for %s", async (method, url, body) => {
    let observed: { method?: string; url?: string; body: string } | null = null;
    const forwarded = new Promise<void>((resolveForwarded) => {
      createTrustedIngressHandler("local", config(), {
        forward: async (req, res) => {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(Buffer.from(chunk));
          observed = { method: req.method, url: req.url, body: Buffer.concat(chunks).toString("utf8") };
          res.writeHead(204);
          res.end();
          resolveForwarded();
        },
      })(request({ method, url, body, remoteAddress: "172.30.253.1" }), response().res);
    });
    await forwarded;
    expect(observed).toEqual({ method, url, body });
  });

  it("fails startup configuration closed when the proxy secret is missing or weak", () => {
    expect(() => loadTrustedIngressConfig({
      GUEST_WEB_PROXY_TRUST_SECRET: "",
      TRUSTED_INGRESS_TUNNEL_PEER_HOST: "cloudflared",
    })).toThrow(/proxy secret is not configured/);
    expect(() => loadTrustedIngressConfig({
      GUEST_WEB_PROXY_TRUST_SECRET: "too-short",
      TRUSTED_INGRESS_TUNNEL_PEER_HOST: "cloudflared",
    })).toThrow(/proxy secret is not configured/);
  });

  it("keeps the origin private and separates public, local and email profiles in Compose", () => {
    const compose = readFileSync(join(process.cwd(), "docker-compose.demo.yml"), "utf8");
    const suiteBlock = compose.slice(compose.indexOf("  suite:"), compose.indexOf("  trusted-ingress:"));
    const ingressBlock = compose.slice(compose.indexOf("  trusted-ingress:"), compose.indexOf("  hotel-demo:"));
    const emailBlock = compose.slice(compose.indexOf("  email-worker:"), compose.indexOf("  cloudflared:"));
    const cloudflaredBlock = compose.slice(compose.indexOf("  cloudflared:"), compose.indexOf("\nvolumes:"));

    expect(suiteBlock).not.toMatch(/\n\s+ports:/);
    expect(ingressBlock).toContain('"127.0.0.1:3000:3000"');
    expect(ingressBlock).toContain('TRUSTED_INGRESS_LOCAL_BIND_ADDRESS: "172.30.253.2"');
    expect(ingressBlock).toContain('TRUSTED_INGRESS_LOCAL_PEER_ADDRESS: "172.30.253.1"');
    expect(ingressBlock).toContain('TRUSTED_INGRESS_TUNNEL_BIND_ADDRESS: "172.30.254.2"');
    expect(ingressBlock).toContain("local-ingress:");
    expect(ingressBlock).toContain("ipv4_address: 172.30.253.2");
    expect(ingressBlock).toContain("gw_priority: 1");
    expect(ingressBlock).toContain("TRUSTED_INGRESS_TUNNEL_PEER_HOST: cloudflared");
    expect(ingressBlock).not.toContain("GUEST_WEB_CONVERSATION_SECRET");
    expect(ingressBlock).not.toMatch(/\n\s+env_file:/);
    expect(emailBlock).toContain('profiles: ["email"]');
    expect(cloudflaredBlock).toContain('profiles: ["public"]');
    expect(cloudflaredBlock).toContain('"127.0.0.1:2000:2000"');
    expect(cloudflaredBlock).toContain("condition: service_healthy");
    expect(cloudflaredBlock).toContain("tunnel-ingress:");
    expect(compose).toContain('"127.0.0.1:8081:8081"');
    expect(compose).toContain("tunnel-ingress:\n    internal: true");
    expect(compose).not.toContain("local-ingress:\n    internal: true");
    expect(compose).toContain("subnet: 172.30.253.0/29");
    expect(compose).toContain("gateway: 172.30.253.1");
    expect(compose).toContain("ipv4_address: 172.30.254.3");

    const tunnelConfig = readFileSync(join(process.cwd(), "infra/cloudflared/config.demo.yml"), "utf8");
    expect(tunnelConfig).toContain("service: http://trusted-ingress:3001");
    expect(tunnelConfig).not.toContain("service: http://suite:3000");
  });

  it("does not log secrets, capabilities, signed headers or request headers", () => {
    const source = readFileSync(join(process.cwd(), "lib/infra/trustedIngress.ts"), "utf8");
    const loggingLines = source.split("\n").filter((line) => /console\.(log|warn|error)/.test(line));
    expect(loggingLines.join("\n")).not.toMatch(/secret|capability|authorization|x-begasist/i);
  });
});
