import { describe, expect, it, vi } from "vitest";
import { resolveEmailCredentials } from "@/lib/email/resolveEmailCredentials";
import {
  executeConnectivityProbe,
  formatConnectivityProbeResult,
  type ConnectivityProbeDependencies,
} from "@/scripts/test-imap-smtp";
import type { EmailConfig } from "@/types/channel";

const baseEmail: EmailConfig = {
  enabled: true,
  mode: "automatic",
  dirEmail: "probe@example.invalid",
  imapHost: "imap.example.invalid",
  imapPort: 993,
  smtpHost: "smtp.example.invalid",
  smtpPort: 587,
  secure: false,
  secretRef: "hotel-main",
};

function createHarness(options: {
  environment?: Record<string, string | undefined>;
  email?: EmailConfig;
  pathExists?: (candidate: string) => boolean;
} = {}) {
  const environment: Record<string, string | undefined> = options.environment ?? {
    BEGASIST_DEMO_ENV_FILE: ".env",
    HOTEL_ID: "hotel-probe",
    EMAIL_PASS__HOTEL_MAIN: "secret-ref-password",
  };
  const email = options.email ?? baseEmail;
  const end = vi.fn(async () => undefined);
  const openBox = vi.fn(async () => undefined);
  const connectImap = vi.fn(async (_config: unknown) => ({ end, openBox }));
  const verify = vi.fn(async () => true);
  const close = vi.fn();
  const sendMail = vi.fn();
  const createSmtpTransport = vi.fn((_config: unknown) => ({ verify, close, sendMail }));
  const getHotelConfig = vi.fn(async () => ({ channelConfigs: { email } }));
  const loadEnvironment = vi.fn(() => true);

  const dependencies: ConnectivityProbeDependencies = {
    environment,
    cwd: "/repo",
    pathExists: options.pathExists ?? ((candidate) => candidate === "/repo/.env"),
    loadEnvironment,
    loadRuntime: vi.fn(async () => ({ getHotelConfig, resolveEmailCredentials })),
    connectImap,
    createSmtpTransport,
  };

  return {
    dependencies,
    end,
    openBox,
    connectImap,
    verify,
    close,
    sendMail,
    createSmtpTransport,
    getHotelConfig,
    loadEnvironment,
  };
}

describe("secure email connectivity probe", () => {
  it("reports IMAP and SMTP PASS through secretRef and closes both clients", async () => {
    const harness = createHarness();

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(0);
    expect(execution.result).toMatchObject({
      ok: true,
      configSource: "hotel_config",
      environmentSource: "repository_env",
      primaryCredentialSource: "secret_ref",
      effectiveCredentialSource: "secret_ref",
      imap: { connectivity: "PASS", authentication: "PASS" },
      smtp: { connectivity: "PASS", authentication: "PASS" },
    });
    expect(harness.end).toHaveBeenCalledOnce();
    expect(harness.close).toHaveBeenCalledOnce();
    expect(harness.openBox).not.toHaveBeenCalled();
    expect(harness.sendMail).not.toHaveBeenCalled();
    expect(harness.connectImap).toHaveBeenCalledWith(
      expect.objectContaining({
        imap: expect.objectContaining({
          tls: true,
          tlsOptions: { rejectUnauthorized: true },
        }),
      }),
    );
    expect(harness.createSmtpTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: false,
        requireTLS: true,
        tls: { rejectUnauthorized: true },
      }),
    );
  });

  it("preserves direct TLS for secure SMTP without allowing plaintext transport", async () => {
    const harness = createHarness({ email: { ...baseEmail, secure: true, smtpPort: 465 } });

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(0);
    expect(harness.createSmtpTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        secure: true,
        requireTLS: false,
        tls: { rejectUnauthorized: true },
      }),
    );
    expect(harness.verify).toHaveBeenCalledOnce();
    expect(harness.sendMail).not.toHaveBeenCalled();
  });

  it("returns 20 for IMAP connectivity errors", async () => {
    const harness = createHarness();
    harness.connectImap.mockRejectedValueOnce(new Error("connection refused"));

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(20);
    expect(execution.result.imap).toEqual({ connectivity: "FAIL", authentication: "NOT_RUN" });
    expect(execution.result.smtp).toEqual({ connectivity: "PASS", authentication: "PASS" });
  });

  it("returns 21 for IMAP authentication errors without inline fallback", async () => {
    const harness = createHarness();
    harness.connectImap.mockRejectedValueOnce(
      Object.assign(new Error("authentication rejected"), { textCode: "AUTHENTICATIONFAILED" }),
    );

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(21);
    expect(execution.result.imap).toEqual({ connectivity: "PASS", authentication: "FAIL" });
    expect(harness.connectImap).toHaveBeenCalledOnce();
  });

  it("returns 30 for SMTP connectivity errors and closes the transporter", async () => {
    const harness = createHarness();
    harness.verify.mockRejectedValueOnce(new Error("socket timeout"));

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(30);
    expect(execution.result.smtp).toEqual({ connectivity: "FAIL", authentication: "NOT_RUN" });
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("returns 31 for SMTP authentication errors", async () => {
    const harness = createHarness();
    harness.verify.mockRejectedValueOnce(Object.assign(new Error("login rejected"), { code: "EAUTH" }));

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(31);
    expect(execution.result.smtp).toEqual({ connectivity: "PASS", authentication: "FAIL" });
  });

  it("uses EMAIL_PASS only after inline IMAP authentication fails", async () => {
    const harness = createHarness({
      environment: {
        BEGASIST_DEMO_ENV_FILE: ".env",
        HOTEL_ID: "hotel-probe",
        EMAIL_PASS: "environment-fallback-password",
      },
      email: { ...baseEmail, secretRef: undefined, password: "inline-password" },
    });
    harness.connectImap
      .mockRejectedValueOnce(Object.assign(new Error("auth failed"), { textCode: "AUTHENTICATIONFAILED" }))
      .mockResolvedValueOnce({ end: harness.end, openBox: harness.openBox });

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(0);
    expect(execution.result.primaryCredentialSource).toBe("inline");
    expect(execution.result.effectiveCredentialSource).toBe("email_pass_fallback");
    expect(harness.connectImap).toHaveBeenCalledTimes(2);
    expect(harness.connectImap.mock.calls[0][0]).toMatchObject({
      imap: { password: "inline-password" },
    });
    expect(harness.connectImap.mock.calls[1][0]).toMatchObject({
      imap: { password: "environment-fallback-password" },
    });
    expect(harness.createSmtpTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: expect.objectContaining({ pass: "environment-fallback-password" }) }),
    );
  });

  it("returns 10 without resolved credentials and performs no network operations", async () => {
    const harness = createHarness({
      environment: {
        BEGASIST_DEMO_ENV_FILE: ".env",
        HOTEL_ID: "hotel-probe",
      },
      email: { ...baseEmail, secretRef: undefined, password: undefined },
    });

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(10);
    expect(execution.result.primaryCredentialSource).toBe("none");
    expect(harness.connectImap).not.toHaveBeenCalled();
    expect(harness.createSmtpTransport).not.toHaveBeenCalled();
  });

  it("requires the environment selector", async () => {
    const harness = createHarness({ environment: { HOTEL_ID: "hotel-probe" } });

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(10);
    expect(execution.result.environmentSource).toBe("unselected");
    expect(harness.loadEnvironment).not.toHaveBeenCalled();
    expect(harness.getHotelConfig).not.toHaveBeenCalled();
  });

  it("fails closed when an external environment is selected while repository .env exists", async () => {
    const harness = createHarness({
      environment: {
        BEGASIST_DEMO_ENV_FILE: "/secure/demo.env",
        HOTEL_ID: "hotel-probe",
      },
      pathExists: (candidate) => candidate === "/repo/.env" || candidate === "/secure/demo.env",
    });

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(40);
    expect(execution.result.environmentSource).toBe("external_env");
    expect(harness.loadEnvironment).not.toHaveBeenCalled();
    expect(harness.getHotelConfig).not.toHaveBeenCalled();
  });

  it("uses a selected external environment when repository .env is absent", async () => {
    const harness = createHarness({
      environment: {
        BEGASIST_DEMO_ENV_FILE: "/secure/demo.env",
        HOTEL_ID: "hotel-probe",
        EMAIL_PASS__HOTEL_MAIN: "external-secret-ref-password",
      },
      pathExists: (candidate) => candidate === "/secure/demo.env",
    });

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(0);
    expect(execution.result.environmentSource).toBe("external_env");
    expect(harness.loadEnvironment).toHaveBeenCalledWith("/secure/demo.env", harness.dependencies.environment);
  });

  it("does not use EMAIL_PASS after an inline IMAP connectivity failure", async () => {
    const harness = createHarness({
      environment: {
        BEGASIST_DEMO_ENV_FILE: ".env",
        HOTEL_ID: "hotel-probe",
        EMAIL_PASS: "must-not-be-used",
      },
      email: { ...baseEmail, secretRef: undefined, password: "inline-password" },
    });
    harness.connectImap.mockRejectedValueOnce(new Error("network unavailable"));

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(20);
    expect(execution.result.effectiveCredentialSource).toBe("inline");
    expect(harness.connectImap).toHaveBeenCalledOnce();
  });

  it("closes an IMAP connection that resolves after the probe timeout", async () => {
    vi.useFakeTimers();
    try {
      const harness = createHarness();
      let resolveConnection!: (connection: { end: () => Promise<void> }) => void;
      const pendingConnection = new Promise<{ end: () => Promise<void> }>((resolve) => {
        resolveConnection = resolve;
      });
      harness.dependencies.connectImap = vi.fn(() => pendingConnection);

      const executionPromise = executeConnectivityProbe(harness.dependencies);
      await vi.advanceTimersByTimeAsync(12_000);
      const execution = await executionPromise;
      expect(execution.exitCode).toBe(20);

      resolveConnection({ end: harness.end });
      await Promise.resolve();
      await Promise.resolve();
      expect(harness.end).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("requires HOTEL_ID after loading the selected environment", async () => {
    const harness = createHarness({ environment: { BEGASIST_DEMO_ENV_FILE: ".env" } });

    const execution = await executeConnectivityProbe(harness.dependencies);

    expect(execution.exitCode).toBe(10);
    expect(harness.loadEnvironment).toHaveBeenCalledOnce();
    expect(harness.getHotelConfig).not.toHaveBeenCalled();
  });

  it("never emits raw errors or sensitive values in the contractual result", async () => {
    const harness = createHarness();
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");
    harness.connectImap.mockRejectedValueOnce(
      Object.assign(new Error("auth secret-ref-password probe@example.invalid imap.example.invalid"), {
        textCode: "AUTHENTICATIONFAILED",
      }),
    );

    const execution = await executeConnectivityProbe(harness.dependencies);
    const output = formatConnectivityProbeResult(execution.result);

    expect(output).not.toContain("secret-ref-password");
    expect(output).not.toContain("probe@example.invalid");
    expect(output).not.toContain("imap.example.invalid");
    expect(output).not.toContain("hotel-main");
    expect(logSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
