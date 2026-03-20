import { afterEach, describe, expect, it, vi } from "vitest";

const DEBUGLOG_CONSOLE_STATE_KEY = "__begasistDebugLogConsoleState__";

describe("debugLog console hook", () => {
  const baseline = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
  };

  afterEach(() => {
    console.log = baseline.log;
    console.info = baseline.info;
    console.warn = baseline.warn;
    console.error = baseline.error;
    console.debug = baseline.debug;
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
});
