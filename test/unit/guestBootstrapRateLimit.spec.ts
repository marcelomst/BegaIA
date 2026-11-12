// Path: test/unit/guestBootstrapRateLimit.spec.ts

import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const redisEval = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/redis", () => ({
  redis: { eval: redisEval },
}));

import {
  enforceGuestBootstrapRateLimit,
} from "@/lib/security/guestBootstrapRateLimit";

const PROXY_SECRET = "proxy-trust-test-secret-with-at-least-32-bytes";

function trustedHeaders(address: string, timestamp = Math.floor(Date.now() / 1000)) {
  const timestampText = String(timestamp);
  const signature = crypto
    .createHmac("sha256", PROXY_SECRET)
    .update(`v1\n${timestampText}\n${address}`, "utf8")
    .digest("hex");
  return {
    "x-begasist-client-ip": address,
    "x-begasist-proxy-timestamp": timestampText,
    "x-begasist-proxy-signature": signature,
  };
}

describe("Guest Web bootstrap distributed rate limit", () => {
  beforeEach(() => {
    vi.stubEnv("REDIS_URL", "redis://rate-limit.test:6379");
    vi.stubEnv("GUEST_WEB_BOOTSTRAP_RATE_LIMIT", "2");
    vi.stubEnv("GUEST_WEB_BOOTSTRAP_RATE_WINDOW_SECONDS", "60");
    vi.stubEnv("GUEST_WEB_PROXY_TRUST_SECRET", PROXY_SECRET);
    redisEval.mockReset();
  });

  it("uses an atomic Redis counter and accepts requests inside the limit", async () => {
    redisEval.mockResolvedValueOnce(2);
    await expect(enforceGuestBootstrapRateLimit(new Request("http://localhost", {
      headers: trustedHeaders("203.0.113.25"),
    }), "hotel999")).resolves.toBeUndefined();
    expect(redisEval).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR'"),
      1,
      expect.stringMatching(/^guest-web-bootstrap:v1:hotel999:[a-f0-9]{64}$/),
      "60",
    );
  });

  it("rejects over-limit requests", async () => {
    redisEval.mockResolvedValueOnce(3);
    await expect(enforceGuestBootstrapRateLimit(
      new Request("http://localhost", { headers: trustedHeaders("203.0.113.25") }),
      "hotel999",
    )).rejects.toMatchObject({
      status: 429,
      code: "guest_bootstrap_rate_limited",
    });
  });

  it("fails closed when Redis is not configured or unavailable", async () => {
    vi.stubEnv("REDIS_URL", "");
    await expect(enforceGuestBootstrapRateLimit(
      new Request("http://localhost"),
      "hotel999",
    )).rejects.toMatchObject({ status: 503, code: "guest_bootstrap_rate_limit_unavailable" });

    vi.stubEnv("REDIS_URL", "redis://rate-limit.test:6379");
    redisEval.mockRejectedValueOnce(new Error("redis unavailable"));
    await expect(enforceGuestBootstrapRateLimit(
      new Request("http://localhost", { headers: trustedHeaders("203.0.113.25") }),
      "hotel999",
    )).rejects.toMatchObject({ status: 503, code: "guest_bootstrap_rate_limit_unavailable" });
  });

  it("rejects caller-supplied forwarding headers without a valid ingress assertion", async () => {
    await expect(enforceGuestBootstrapRateLimit(new Request("http://localhost", {
      headers: {
        "cf-connecting-ip": "203.0.113.40",
        "x-real-ip": "203.0.113.41",
        "x-forwarded-for": "203.0.113.42",
      },
    }), "hotel999")).rejects.toMatchObject({
      status: 503,
      code: "guest_bootstrap_client_identity_untrusted",
    });

    await expect(enforceGuestBootstrapRateLimit(new Request("http://localhost", {
      headers: {
        ...trustedHeaders("203.0.113.43"),
        "x-begasist-proxy-signature": "0".repeat(64),
      },
    }), "hotel999")).rejects.toMatchObject({ code: "guest_bootstrap_client_identity_untrusted" });
    expect(redisEval).not.toHaveBeenCalled();
  });

  it("uses the signed ingress identity and keeps distinct clients on distinct Redis keys", async () => {
    redisEval.mockResolvedValue(1);
    await enforceGuestBootstrapRateLimit(new Request("http://localhost", {
      headers: { ...trustedHeaders("203.0.113.50"), "x-forwarded-for": "198.51.100.99" },
    }), "hotel999");
    await enforceGuestBootstrapRateLimit(new Request("http://localhost", {
      headers: trustedHeaders("203.0.113.51"),
    }), "hotel999");
    const firstKey = redisEval.mock.calls[0][2];
    const secondKey = redisEval.mock.calls[1][2];
    expect(firstKey).not.toBe(secondKey);
  });

  it("does not log REDIS_URL or Redis error payloads", () => {
    const source = readFileSync(join(process.cwd(), "lib/services/redis.ts"), "utf8");
    const loggingLines = source.split("\n").filter((line) => /console\.(log|warn|error)/.test(line));
    expect(loggingLines.join("\n")).not.toContain("redisUrl");
    expect(loggingLines.join("\n")).not.toContain("err.message");
    expect(source).not.toContain("Connecting to:");
  });
});
