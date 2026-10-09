import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DEBUGLOG_CONSOLE_STATE_KEY = "__begasistDebugLogConsoleState__";

describe("debugLog console hook", () => {
  let logRoot: string;
  const baselineRequire = (globalThis as typeof globalThis & { require?: NodeRequire }).require;
  const baseline = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  beforeEach(() => {
    logRoot = mkdtempSync(join(tmpdir(), "begasist-debug-log-"));
    vi.stubEnv("BEGASIST_ROOT", logRoot);
    (globalThis as typeof globalThis & { require?: NodeRequire }).require = createRequire(import.meta.url);
  });

  afterEach(() => {
    console.log = baseline.log;
    console.info = baseline.info;
    console.warn = baseline.warn;
    console.error = baseline.error;
    console.debug = baseline.debug;
    delete (globalThis as any)[DEBUGLOG_CONSOLE_STATE_KEY];
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
    rmSync(logRoot, { recursive: true, force: true });
    if (baselineRequire) {
      (globalThis as typeof globalThis & { require?: NodeRequire }).require = baselineRequire;
    } else {
      Reflect.deleteProperty(globalThis, "require");
    }
  });

  it("wraps console only once across module reimports", async () => {
    const warnSpy = vi.spyOn(console, "warn");

    await import("@/lib/utils/debugLog");

    const firstWrapped = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    expect(firstWrapped.log).not.toBe(baseline.log);
    expect(firstWrapped.warn).not.toBe(baseline.warn);
    expect(firstWrapped.debug).not.toBe(baseline.debug);

    vi.resetModules();
    await import("@/lib/utils/debugLog");

    expect(console.log).toBe(firstWrapped.log);
    expect(console.info).toBe(firstWrapped.info);
    expect(console.warn).toBe(firstWrapped.warn);
    expect(console.error).toBe(firstWrapped.error);
    expect(console.debug).toBe(firstWrapped.debug);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect((globalThis as any)[DEBUGLOG_CONSOLE_STATE_KEY]).toMatchObject({
      installed: true,
      traceLogged: true,
    });
  });

  it("redacts provider credentials while preserving safe diagnostics", async () => {
    const apiKey = ["sk", "synthetic", "unit", "test", "value"].join("-");
    const accessToken = ["eyJsyntheticHeader", "syntheticPayload", "syntheticSignature"].join(".");
    const opaqueToken = ["synthetic", "opaque", "token", "value"].join("_");
    const { sanitizeForLogging } = await import("@/lib/utils/debugLog");

    const providerError = Object.assign(new Error(`request failed with Bearer ${apiKey}`), {
      name: "AuthenticationError",
      status: 401,
      durationMs: 27,
      category: "authentication_error",
      requestSummary: `token="${opaqueToken}" Authorization: Token ${opaqueToken}`,
      config: {
        apiKey,
        request: new Request(`https://provider.invalid/v1/resource?key=${apiKey}`, {
          method: "POST",
          headers: { Authorization: `Token ${accessToken}` },
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-api-key": apiKey,
        },
      },
    });

    const serialized = JSON.stringify(sanitizeForLogging(providerError));

    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(accessToken);
    expect(serialized).not.toContain(opaqueToken);
    expect(serialized).toContain("[REDACTED]");
    expect(serialized).toContain("AuthenticationError");
    expect(serialized).toContain("authentication_error");
    expect(serialized).toContain('"status":401');
    expect(serialized).toContain('"durationMs":27');
  });

  it("keeps ordinary logging functional and redacts console and file output", async () => {
    const apiKey = ["sk", "synthetic", "console", "test", "value"].join("-");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { logToFile } = await import("@/lib/utils/debugLog");

    console.error("provider request failed", {
      status: 429,
      durationMs: 43,
      headers: { authorization: `Bearer ${apiKey}` },
    });
    await logToFile("error", "ordinary error", {
      category: "network_error",
      status: 503,
      durationMs: 18,
      apiKey,
    });

    const consolePayload = JSON.stringify(errorSpy.mock.calls);
    const filePayload = readFileSync(join(logRoot, "debug", "log.txt"), "utf8");

    expect(consolePayload).not.toContain(apiKey);
    expect(filePayload).not.toContain(apiKey);
    expect(consolePayload).toContain("[REDACTED]");
    expect(filePayload).toContain("[REDACTED]");
    expect(filePayload).toContain("ordinary error");
    expect(filePayload).toContain("network_error");
    expect(filePayload).toContain('"status": 503');
    expect(filePayload).toContain('"durationMs": 18');
  });
});
