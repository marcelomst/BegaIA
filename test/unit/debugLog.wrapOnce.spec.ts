import { afterEach, describe, expect, it, vi } from "vitest";

const DEBUGLOG_CONSOLE_STATE_KEY = "__begasistDebugLogConsoleState__";

describe("debugLog console hook", () => {
  const baseline = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  afterEach(() => {
    console.log = baseline.log;
    console.info = baseline.info;
    console.warn = baseline.warn;
    console.error = baseline.error;
    delete (globalThis as any)[DEBUGLOG_CONSOLE_STATE_KEY];
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("wraps console only once across module reimports", async () => {
    const warnSpy = vi.spyOn(console, "warn");

    await import("@/lib/utils/debugLog");

    const firstWrapped = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
    };

    expect(firstWrapped.log).not.toBe(baseline.log);
    expect(firstWrapped.warn).not.toBe(baseline.warn);

    vi.resetModules();
    await import("@/lib/utils/debugLog");

    expect(console.log).toBe(firstWrapped.log);
    expect(console.info).toBe(firstWrapped.info);
    expect(console.warn).toBe(firstWrapped.warn);
    expect(console.error).toBe(firstWrapped.error);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect((globalThis as any)[DEBUGLOG_CONSOLE_STATE_KEY]).toMatchObject({
      installed: true,
      traceLogged: true,
    });
  });
});
