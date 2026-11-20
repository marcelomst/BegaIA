import { constants } from "node:fs";
import dotenv from "dotenv";
import { describe, expect, it, vi } from "vitest";
import {
  emailSecretEnvVarName,
  resolveEmailCredentials,
} from "@/lib/email/resolveEmailCredentials";
import {
  executeConnectivityProbe,
  executeExactTargetProbe,
  formatConnectivityProbeResult,
  formatExactTargetProbeResult,
  readSecureExternalEnvironmentFile,
  type ConnectivityProbeDependencies,
  type SecureEnvironmentFileDependencies,
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
  const getHotelEmailConnectionConfig = vi.fn(async () => email);
  const loadEnvironment = vi.fn(() => true);

  const dependencies: ConnectivityProbeDependencies = {
    environment,
    cwd: "/repo",
    pathExists: options.pathExists ?? ((candidate) => candidate === "/repo/.env"),
    loadEnvironment,
    readExternalEnvironment: vi.fn(async () => null),
    loadRuntime: vi.fn(async () => ({
      getHotelConfig,
      getHotelEmailConnectionConfig,
      resolveEmailCredentials,
      emailSecretEnvVarName,
    })),
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
    getHotelEmailConnectionConfig,
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

const exactTargetRequest = {
  hotelId: "hotel999",
  secretRef: "demo-hotel999-main",
};

function createExactTargetHarness(options: {
  selectedEnvironment?: Record<string, string | undefined>;
  inheritedEnvironment?: Record<string, string | undefined>;
  email?: EmailConfig;
} = {}) {
  const targetVariable = emailSecretEnvVarName(exactTargetRequest.secretRef);
  const selectedEnvironment = options.selectedEnvironment ?? {
    [targetVariable]: "selected-target-credential",
  };
  const environment = {
    BEGASIST_DEMO_ENV_FILE: "/secure/hotel999.env",
    ...options.inheritedEnvironment,
  };
  const email = options.email ?? {
    ...baseEmail,
    secretRef: undefined,
    password: "inline-must-not-be-selected",
  };
  const end = vi.fn(async () => undefined);
  const openBox = vi.fn(async () => undefined);
  const connectImap = vi.fn(async (_config: unknown) => ({ end, openBox }));
  const verify = vi.fn(async () => true);
  const close = vi.fn();
  const sendMail = vi.fn();
  const createSmtpTransport = vi.fn((_config: unknown) => ({ verify, close, sendMail }));
  const getHotelConfig = vi.fn(async () => ({ channelConfigs: { email } }));
  const getHotelEmailConnectionConfig = vi.fn(async () => email);
  const loadEnvironment = vi.fn((
    _selectedPath: string,
    targetEnvironment: Record<string, string | undefined>,
  ) => {
    Object.assign(targetEnvironment, selectedEnvironment);
    return true;
  });
  const readExternalEnvironment = vi.fn(async () => ({ ...selectedEnvironment }));
  const dependencies: ConnectivityProbeDependencies = {
    environment,
    cwd: "/repo",
    pathExists: (candidate) => candidate === "/secure/hotel999.env",
    loadEnvironment,
    readExternalEnvironment,
    loadRuntime: vi.fn(async () => ({
      getHotelConfig,
      getHotelEmailConnectionConfig,
      resolveEmailCredentials,
      emailSecretEnvVarName,
    })),
    connectImap,
    createSmtpTransport,
  };

  return {
    dependencies,
    targetVariable,
    end,
    openBox,
    connectImap,
    verify,
    close,
    sendMail,
    createSmtpTransport,
    getHotelConfig,
    getHotelEmailConnectionConfig,
    loadEnvironment,
    readExternalEnvironment,
  };
}

function createSecureEnvironmentFileHarness(options: {
  openedPath?: string;
  openError?: Error;
  regularFile?: boolean;
  fileUid?: number;
  processUid?: number;
  mode?: number;
  contents?: string;
  replacementAfterOpen?: string;
} = {}) {
  let pathnameContents = Buffer.from(
    options.contents ?? "EMAIL_PASS__DEMO_HOTEL999_MAIN=selected-target-credential\n",
  );
  const readFile = vi.fn(async () => Buffer.alloc(0));
  const close = vi.fn(async () => undefined);
  const stat = vi.fn(async () => ({
    isFile: () => options.regularFile ?? true,
    uid: options.fileUid ?? 1000,
    mode: options.mode ?? 0o100600,
  }));
  const openFile = vi.fn(async (_selectedPath: string, _flags: number) => {
    if (options.openError) throw options.openError;
    const openedContents = Buffer.from(pathnameContents);
    if (options.replacementAfterOpen !== undefined) {
      pathnameContents = Buffer.from(options.replacementAfterOpen);
    }
    readFile.mockImplementationOnce(async () => Buffer.from(openedContents));
    return { fd: 73, stat, readFile, close };
  });
  const openedFilePath = vi.fn(async () => options.openedPath ?? "/secure/hotel999.env");
  const dependencies: SecureEnvironmentFileDependencies = {
    openFile,
    openedFilePath,
    currentUid: () => options.processUid ?? 1000,
    parseEnvironment: (contents) => dotenv.parse(contents),
  };

  return { dependencies, openFile, openedFilePath, stat, readFile, close };
}

describe("exact-target secure external environment file", () => {
  it("accepts an absolute external path", async () => {
    const harness = createSecureEnvironmentFileHarness();

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toEqual({ EMAIL_PASS__DEMO_HOTEL999_MAIN: "selected-target-credential" });
  });

  it("rejects a relative path before open", async () => {
    const harness = createSecureEnvironmentFileHarness();

    const parsed = await readSecureExternalEnvironmentFile(
      "../secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toBeNull();
    expect(harness.openFile).not.toHaveBeenCalled();
  });

  it("rejects a path inside the repository", async () => {
    const harness = createSecureEnvironmentFileHarness({ openedPath: "/repo/private.env" });

    const parsed = await readSecureExternalEnvironmentFile(
      "/repo/private.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toBeNull();
    expect(harness.openFile).not.toHaveBeenCalled();
  });

  it("accepts an external directory with a repository-like prefix", async () => {
    const harness = createSecureEnvironmentFileHarness({
      openedPath: "/repository-secure/hotel999.env",
    });

    const parsed = await readSecureExternalEnvironmentFile(
      "/repository-secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).not.toBeNull();
  });

  it("rejects a final symlink through O_NOFOLLOW", async () => {
    const harness = createSecureEnvironmentFileHarness({
      openError: Object.assign(new Error("synthetic symlink"), { code: "ELOOP" }),
    });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toBeNull();
    expect(harness.openFile).toHaveBeenCalledWith(
      "/secure/hotel999.env",
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
  });

  it("rejects an absent file", async () => {
    const harness = createSecureEnvironmentFileHarness({
      openError: Object.assign(new Error("synthetic absent file"), { code: "ENOENT" }),
    });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toBeNull();
  });

  it("rejects a directory instead of a regular file", async () => {
    const harness = createSecureEnvironmentFileHarness({ regularFile: false });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toBeNull();
    expect(harness.readFile).not.toHaveBeenCalled();
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("rejects a file owned by another user", async () => {
    const harness = createSecureEnvironmentFileHarness({ fileUid: 2000, processUid: 1000 });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toBeNull();
    expect(harness.readFile).not.toHaveBeenCalled();
  });

  it("rejects permissions other than 0600", async () => {
    const harness = createSecureEnvironmentFileHarness({ mode: 0o100640 });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toBeNull();
    expect(harness.readFile).not.toHaveBeenCalled();
  });

  it("accepts a regular 0600 file owned by the process", async () => {
    const harness = createSecureEnvironmentFileHarness({ mode: 0o100600 });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).not.toBeNull();
    expect(harness.stat).toHaveBeenCalledOnce();
    expect(harness.readFile).toHaveBeenCalledOnce();
    expect(harness.close).toHaveBeenCalledOnce();
  });

  it("opens once and reads only through the validated descriptor", async () => {
    const harness = createSecureEnvironmentFileHarness();

    await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(harness.openFile).toHaveBeenCalledOnce();
    expect(harness.openedFilePath).toHaveBeenCalledWith(73);
    expect(harness.readFile).toHaveBeenCalledOnce();
  });

  it("is unaffected by pathname replacement after open", async () => {
    const harness = createSecureEnvironmentFileHarness({
      contents: "TARGET=opened-value\n",
      replacementAfterOpen: "TARGET=replacement-value\n",
    });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toEqual({ TARGET: "opened-value" });
  });

  it("does not allow an inherited target variable to replace file provenance", async () => {
    const targetVariable = emailSecretEnvVarName(exactTargetRequest.secretRef);
    const harness = createExactTargetHarness({
      selectedEnvironment: {},
      inheritedEnvironment: { [targetVariable]: "inherited-must-not-be-used" },
    });

    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.exitCode).toBe(40);
    expect(harness.connectImap).not.toHaveBeenCalled();
  });

  it("parses the selected credential directly from descriptor contents", async () => {
    const harness = createSecureEnvironmentFileHarness({
      contents: "EMAIL_PASS__DEMO_HOTEL999_MAIN='credential with spaces'\n",
    });

    const parsed = await readSecureExternalEnvironmentFile(
      "/secure/hotel999.env",
      "/repo",
      harness.dependencies,
    );

    expect(parsed).toEqual({ EMAIL_PASS__DEMO_HOTEL999_MAIN: "credential with spaces" });
  });

  it("suppresses sensitive filesystem and content errors", async () => {
    const logSpy = vi.spyOn(console, "log");
    const errorSpy = vi.spyOn(console, "error");
    const harness = createSecureEnvironmentFileHarness({
      openError: new Error("synthetic-secret /secure/hotel999.env"),
    });

    try {
      const parsed = await readSecureExternalEnvironmentFile(
        "/secure/hotel999.env",
        "/repo",
        harness.dependencies,
      );

      expect(parsed).toBeNull();
      expect(logSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});

describe("exact-target hotel999 credential probe", () => {
  it("accepts only the approved hotel and secretRef", async () => {
    const harness = createExactTargetHarness();
    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.exitCode).toBe(0);
    expect(execution.result.probeResult).toBe("PASS");
  });

  it("rejects a different secretRef before environment or network access", async () => {
    const harness = createExactTargetHarness();
    const execution = await executeExactTargetProbe(harness.dependencies, {
      ...exactTargetRequest,
      secretRef: "different-main",
    });

    expect(execution).toMatchObject({ exitCode: 40, result: { probeResult: "INCONCLUSIVE" } });
    expect(harness.readExternalEnvironment).not.toHaveBeenCalled();
    expect(harness.connectImap).not.toHaveBeenCalled();
  });

  it("rejects a different hotel before environment or network access", async () => {
    const harness = createExactTargetHarness();
    const execution = await executeExactTargetProbe(harness.dependencies, {
      ...exactTargetRequest,
      hotelId: "hotel998",
    });

    expect(execution.exitCode).toBe(40);
    expect(harness.readExternalEnvironment).not.toHaveBeenCalled();
    expect(harness.getHotelConfig).not.toHaveBeenCalled();
    expect(harness.getHotelEmailConnectionConfig).not.toHaveBeenCalled();
  });

  it("rejects an absent target credential", async () => {
    const harness = createExactTargetHarness({ selectedEnvironment: {} });
    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.exitCode).toBe(40);
    expect(harness.getHotelEmailConnectionConfig).not.toHaveBeenCalled();
    expect(harness.connectImap).not.toHaveBeenCalled();
  });

  it("rejects an empty target credential", async () => {
    const targetVariable = emailSecretEnvVarName(exactTargetRequest.secretRef);
    const harness = createExactTargetHarness({ selectedEnvironment: { [targetVariable]: "" } });
    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.exitCode).toBe(40);
    expect(harness.connectImap).not.toHaveBeenCalled();
  });

  it("does not allow an inherited target variable to prevail", async () => {
    const targetVariable = emailSecretEnvVarName(exactTargetRequest.secretRef);
    const harness = createExactTargetHarness({
      selectedEnvironment: {},
      inheritedEnvironment: { [targetVariable]: "inherited-must-not-be-used" },
    });
    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.exitCode).toBe(40);
    expect(harness.connectImap).not.toHaveBeenCalled();
  });

  it("projects hotel_config without selecting its inline password", async () => {
    const harness = createExactTargetHarness();
    await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    const imapConfig = harness.connectImap.mock.calls[0]?.[0] as { imap: { password: string } };
    expect(imapConfig.imap.password).toBe("selected-target-credential");
    expect(imapConfig.imap.password).not.toBe("inline-must-not-be-selected");
  });

  it("never uses EMAIL_PASS as fallback", async () => {
    const targetVariable = emailSecretEnvVarName(exactTargetRequest.secretRef);
    const harness = createExactTargetHarness({
      selectedEnvironment: {
        [targetVariable]: "selected-target-credential",
        EMAIL_PASS: "forbidden-fallback",
      },
    });
    harness.connectImap.mockRejectedValueOnce(
      Object.assign(new Error("rejected"), { textCode: "AUTHENTICATIONFAILED" }),
    );

    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.result.fallbackUsed).toBe(false);
    expect(harness.connectImap).toHaveBeenCalledOnce();
    expect(harness.createSmtpTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: { user: baseEmail.dirEmail, pass: "selected-target-credential" } }),
    );
  });

  it("requires the resolver to select source env", async () => {
    const harness = createExactTargetHarness();
    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.result).toMatchObject({
      primaryCredentialSource: "secret_ref",
      effectiveCredentialSource: "secret_ref",
      fallbackUsed: false,
    });
  });

  it("uses the same selected credential for IMAP and SMTP", async () => {
    const harness = createExactTargetHarness();
    await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    const imapConfig = harness.connectImap.mock.calls[0]?.[0] as { imap: { password: string } };
    const smtpConfig = harness.createSmtpTransport.mock.calls[0]?.[0] as { auth: { pass: string } };
    expect(imapConfig.imap.password).toBe(smtpConfig.auth.pass);
  });

  it("returns PASS only when both authentications pass", async () => {
    const harness = createExactTargetHarness();
    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution).toMatchObject({
      exitCode: 0,
      result: {
        imap: { connectivity: "PASS", authentication: "PASS" },
        smtp: { connectivity: "PASS", authentication: "PASS" },
        probeResult: "PASS",
      },
    });
  });

  it("classifies explicit IMAP authentication rejection as AUTH_FAIL", async () => {
    const harness = createExactTargetHarness();
    harness.connectImap.mockRejectedValueOnce(
      Object.assign(new Error("rejected"), { textCode: "AUTHENTICATIONFAILED" }),
    );

    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution).toMatchObject({
      exitCode: 21,
      result: { imap: { connectivity: "PASS", authentication: "FAIL" }, probeResult: "AUTH_FAIL" },
    });
  });

  it("classifies explicit SMTP authentication rejection as AUTH_FAIL", async () => {
    const harness = createExactTargetHarness();
    harness.verify.mockRejectedValueOnce(Object.assign(new Error("rejected"), { code: "EAUTH" }));

    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution).toMatchObject({
      exitCode: 21,
      result: { smtp: { connectivity: "PASS", authentication: "FAIL" }, probeResult: "AUTH_FAIL" },
    });
  });

  it("classifies timeout as INCONCLUSIVE", async () => {
    const harness = createExactTargetHarness();
    harness.connectImap.mockRejectedValueOnce(new Error("PROBE_TIMEOUT"));

    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution).toMatchObject({
      exitCode: 40,
      result: { imap: { connectivity: "INCONCLUSIVE", authentication: "INCONCLUSIVE" }, probeResult: "INCONCLUSIVE" },
    });
  });

  it("classifies TLS errors as INCONCLUSIVE", async () => {
    const harness = createExactTargetHarness();
    harness.verify.mockRejectedValueOnce(Object.assign(new Error("TLS failure"), { code: "ESOCKET" }));

    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.result.smtp).toEqual({
      connectivity: "INCONCLUSIVE",
      authentication: "INCONCLUSIVE",
    });
    expect(execution.result.probeResult).toBe("INCONCLUSIVE");
  });

  it("classifies DNS and TCP errors as INCONCLUSIVE", async () => {
    const harness = createExactTargetHarness();
    harness.connectImap.mockRejectedValueOnce(Object.assign(new Error("lookup failed"), { code: "ENOTFOUND" }));

    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(execution.result.imap.connectivity).toBe("INCONCLUSIVE");
    expect(execution.result.probeResult).toBe("INCONCLUSIVE");
  });

  it("never invokes openBox", async () => {
    const harness = createExactTargetHarness();
    await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(harness.openBox).not.toHaveBeenCalled();
    expect(harness.end).toHaveBeenCalledOnce();
  });

  it("never invokes sendMail", async () => {
    const harness = createExactTargetHarness();
    await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(harness.verify).toHaveBeenCalledOnce();
    expect(harness.sendMail).not.toHaveBeenCalled();
  });

  it("performs one read and exposes no write dependency", async () => {
    const harness = createExactTargetHarness();
    await executeExactTargetProbe(harness.dependencies, exactTargetRequest);

    expect(harness.getHotelEmailConnectionConfig).toHaveBeenCalledOnce();
    expect(harness.getHotelEmailConnectionConfig).toHaveBeenCalledWith("hotel999");
    expect(harness.getHotelConfig).not.toHaveBeenCalled();
    expect(Object.keys(harness.dependencies)).not.toContain("updateHotelConfig");
  });

  it("formats only sanitized categorical output", async () => {
    const harness = createExactTargetHarness();
    harness.connectImap.mockRejectedValueOnce(
      Object.assign(new Error("selected-target-credential probe@example.invalid"), { code: "EAUTH" }),
    );
    const execution = await executeExactTargetProbe(harness.dependencies, exactTargetRequest);
    const output = formatExactTargetProbeResult(execution.result);

    expect(output.split("\n")).toHaveLength(10);
    expect(output).toContain("PROBE_MODE=EXACT_TARGET");
    expect(output).toContain("PROBE_RESULT=AUTH_FAIL");
    expect(output).not.toContain("selected-target-credential");
    expect(output).not.toContain("probe@example.invalid");
    expect(output).not.toContain("demo-hotel999-main");
  });
});
