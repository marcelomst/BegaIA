// Path: lib/security/guestBootstrapRateLimit.ts

import crypto from "crypto";
import { isIP } from "node:net";

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_SECONDS = 10 * 60;
const PROXY_ASSERTION_MAX_AGE_SECONDS = 5 * 60;
const MIN_PROXY_SECRET_BYTES = 32;

export class GuestBootstrapRateLimitError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(code: string, status: number, message: string) {
    super(message);
    this.name = "GuestBootstrapRateLimitError";
    this.code = code;
    this.status = status;
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function proxyTrustSecret(): string {
  const secret = String(process.env.GUEST_WEB_PROXY_TRUST_SECRET ?? "");
  if (!secret.trim() || Buffer.byteLength(secret, "utf8") < MIN_PROXY_SECRET_BYTES) {
    throw new GuestBootstrapRateLimitError(
      "guest_bootstrap_client_identity_untrusted",
      503,
      "Guest conversation bootstrap is temporarily unavailable",
    );
  }
  return secret;
}

function trustedClientAddress(req: Request, nowMs = Date.now()): string {
  const address = String(req.headers.get("x-begasist-client-ip") ?? "").trim();
  const timestampText = String(req.headers.get("x-begasist-proxy-timestamp") ?? "").trim();
  const signature = String(req.headers.get("x-begasist-proxy-signature") ?? "").trim().toLowerCase();
  const timestamp = Number(timestampText);
  if (
    isIP(address) === 0 ||
    !/^\d{10}$/.test(timestampText) ||
    !Number.isSafeInteger(timestamp) ||
    Math.abs(Math.floor(nowMs / 1000) - timestamp) > PROXY_ASSERTION_MAX_AGE_SECONDS ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    throw new GuestBootstrapRateLimitError(
      "guest_bootstrap_client_identity_untrusted",
      503,
      "Guest conversation bootstrap is temporarily unavailable",
    );
  }
  const expected = crypto
    .createHmac("sha256", proxyTrustSecret())
    .update(`v1\n${timestampText}\n${address}`, "utf8")
    .digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))) {
    throw new GuestBootstrapRateLimitError(
      "guest_bootstrap_client_identity_untrusted",
      503,
      "Guest conversation bootstrap is temporarily unavailable",
    );
  }
  return address;
}

export async function enforceGuestBootstrapRateLimit(req: Request, hotelId: string): Promise<void> {
  if (!String(process.env.REDIS_URL ?? "").trim()) {
    throw new GuestBootstrapRateLimitError(
      "guest_bootstrap_rate_limit_unavailable",
      503,
      "Guest conversation bootstrap is temporarily unavailable",
    );
  }
  const limit = positiveInt(process.env.GUEST_WEB_BOOTSTRAP_RATE_LIMIT, DEFAULT_LIMIT);
  const windowSeconds = positiveInt(
    process.env.GUEST_WEB_BOOTSTRAP_RATE_WINDOW_SECONDS,
    DEFAULT_WINDOW_SECONDS,
  );
  const addressHash = crypto.createHash("sha256").update(trustedClientAddress(req), "utf8").digest("hex");
  const key = `guest-web-bootstrap:v1:${hotelId}:${addressHash}`;
  const script = [
    "local count = redis.call('INCR', KEYS[1])",
    "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
    "return count",
  ].join("\n");

  try {
    const { redis } = await import("@/lib/services/redis");
    const count = Number(await redis.eval(script, 1, key, String(windowSeconds)));
    if (!Number.isFinite(count)) throw new Error("invalid rate-limit response");
    if (count > limit) {
      throw new GuestBootstrapRateLimitError(
        "guest_bootstrap_rate_limited",
        429,
        "Too many guest conversation bootstrap requests",
      );
    }
  } catch (error) {
    if (error instanceof GuestBootstrapRateLimitError) throw error;
    throw new GuestBootstrapRateLimitError(
      "guest_bootstrap_rate_limit_unavailable",
      503,
      "Guest conversation bootstrap is temporarily unavailable",
    );
  }
}
