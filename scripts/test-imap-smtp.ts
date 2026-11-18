import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import imaps from "imap-simple";
import nodemailer from "nodemailer";
import type { EmailConfig } from "@/types/channel";
import type { ResolvedEmailCredentials } from "@/lib/email/resolveEmailCredentials";

type CheckStatus = "PASS" | "FAIL" | "NOT_RUN";
type EnvironmentSource = "repository_env" | "external_env" | "unselected";
type CredentialSource = "secret_ref" | "inline" | "email_pass_fallback" | "none";

export type ConnectivityProbeResult = {
  ok: boolean;
  configSource: "hotel_config" | "unavailable";
  environmentSource: EnvironmentSource;
  primaryCredentialSource: CredentialSource;
  effectiveCredentialSource: CredentialSource;
  imap: {
    connectivity: CheckStatus;
    authentication: CheckStatus;
  };
  smtp: {
    connectivity: CheckStatus;
    authentication: CheckStatus;
  };
};

export type ConnectivityProbeExecution = {
  exitCode: 0 | 10 | 20 | 21 | 30 | 31 | 40;
  result: ConnectivityProbeResult;
};

type ImapConnection = {
  end?: () => void | Promise<void>;
  imap?: { end?: () => void };
};

type SmtpTransport = {
  verify: () => Promise<unknown>;
  close?: () => void;
};

type RuntimeDependencies = {
  getHotelConfig: (hotelId: string) => Promise<{ channelConfigs?: { email?: EmailConfig } } | null>;
  resolveEmailCredentials: (
    email: EmailConfig | undefined,
    environment?: Record<string, string | undefined>,
  ) => ResolvedEmailCredentials | undefined;
};

export type ConnectivityProbeDependencies = {
  environment: Record<string, string | undefined>;
  cwd: string;
  pathExists: (candidate: string) => boolean;
  loadEnvironment: (selectedPath: string, environment: Record<string, string | undefined>) => boolean;
  loadRuntime: () => Promise<RuntimeDependencies>;
  connectImap: (config: unknown) => Promise<ImapConnection>;
  createSmtpTransport: (config: unknown) => SmtpTransport;
};

const IMAP_TIMEOUT_MS = 12_000;
const SMTP_TIMEOUT_MS = 12_000;

function emptyResult(environmentSource: EnvironmentSource = "unselected"): ConnectivityProbeResult {
  return {
    ok: false,
    configSource: "unavailable",
    environmentSource,
    primaryCredentialSource: "none",
    effectiveCredentialSource: "none",
    imap: { connectivity: "NOT_RUN", authentication: "NOT_RUN" },
    smtp: { connectivity: "NOT_RUN", authentication: "NOT_RUN" },
  };
}

function failure(
  exitCode: ConnectivityProbeExecution["exitCode"],
  result: ConnectivityProbeResult,
): ConnectivityProbeExecution {
  return { exitCode, result: { ...result, ok: false } };
}

function isAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Record<string, unknown>;
  const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
  const textCode = typeof candidate.textCode === "string" ? candidate.textCode.toUpperCase() : "";
  const responseCode = typeof candidate.responseCode === "number" ? candidate.responseCode : 0;
  const message = typeof candidate.message === "string" ? candidate.message : "";

  return code === "EAUTH"
    || textCode === "AUTHENTICATIONFAILED"
    || responseCode === 535
    || /auth|credential|invalid login|username and password|password not accepted/i.test(message);
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("PROBE_TIMEOUT")), timeoutMs);
  });

  try {
    return await Promise.race([operation, timedOut]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function closeImap(connection: ImapConnection | undefined): Promise<void> {
  if (!connection) return;
  try {
    if (connection.end) {
      await Promise.resolve(connection.end());
    } else {
      connection.imap?.end?.();
    }
  } catch {
    // Best effort: el resultado del cierre nunca expone el error crudo.
  }
}

async function checkImap(
  email: EmailConfig,
  password: string,
  connectImap: ConnectivityProbeDependencies["connectImap"],
): Promise<ConnectivityProbeResult["imap"]> {
  let connection: ImapConnection | undefined;
  let acceptConnection = true;
  const connectionPromise = connectImap({
    imap: {
      user: email.dirEmail,
      password,
      host: email.imapHost,
      port: Number(email.imapPort) || 993,
      tls: true,
      tlsOptions: {
        rejectUnauthorized: true,
      },
      authTimeout: 10_000,
      connTimeout: 10_000,
      keepalive: false,
    },
  });
  void connectionPromise.then((lateConnection) => {
    if (!acceptConnection) void closeImap(lateConnection);
  }, () => undefined);

  try {
    connection = await withTimeout(connectionPromise, IMAP_TIMEOUT_MS);
    return { connectivity: "PASS", authentication: "PASS" };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { connectivity: "PASS", authentication: "FAIL" };
    }
    return { connectivity: "FAIL", authentication: "NOT_RUN" };
  } finally {
    acceptConnection = false;
    await closeImap(connection);
  }
}

async function checkSmtp(
  email: EmailConfig,
  password: string,
  createSmtpTransport: ConnectivityProbeDependencies["createSmtpTransport"],
): Promise<ConnectivityProbeResult["smtp"]> {
  const secure = email.secure ?? false;
  let transport: SmtpTransport | undefined;
  try {
    transport = createSmtpTransport({
      host: email.smtpHost,
      port: Number(email.smtpPort) || 587,
      secure,
      requireTLS: !secure,
      tls: {
        rejectUnauthorized: true,
      },
      auth: { user: email.dirEmail, pass: password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
    await withTimeout(transport.verify(), SMTP_TIMEOUT_MS);
    return { connectivity: "PASS", authentication: "PASS" };
  } catch (error) {
    if (isAuthenticationError(error)) {
      return { connectivity: "PASS", authentication: "FAIL" };
    }
    return { connectivity: "FAIL", authentication: "NOT_RUN" };
  } finally {
    try {
      transport?.close?.();
    } catch {
      // Best effort: el resultado del cierre nunca expone el error crudo.
    }
  }
}

function primarySource(credentials: ResolvedEmailCredentials): CredentialSource {
  if (credentials.source === "env") return "secret_ref";
  if (credentials.source === "inline") return "inline";
  return "none";
}

function validEmailConfig(email: EmailConfig | undefined): email is EmailConfig {
  return Boolean(
    email?.dirEmail
      && email.imapHost
      && Number.isFinite(Number(email.imapPort))
      && email.smtpHost
      && Number.isFinite(Number(email.smtpPort)),
  );
}

export async function executeConnectivityProbe(
  dependencies: ConnectivityProbeDependencies,
): Promise<ConnectivityProbeExecution> {
  const selector = dependencies.environment.BEGASIST_DEMO_ENV_FILE?.trim();
  if (!selector) return failure(10, emptyResult());

  const repositoryEnvPath = path.resolve(dependencies.cwd, ".env");
  const selectedPath = path.resolve(dependencies.cwd, selector);
  const environmentSource: EnvironmentSource = selectedPath === repositoryEnvPath
    ? "repository_env"
    : "external_env";
  const result = emptyResult(environmentSource);

  if (environmentSource === "external_env" && dependencies.pathExists(repositoryEnvPath)) {
    return failure(40, result);
  }
  if (!dependencies.pathExists(selectedPath)) return failure(10, result);
  if (!dependencies.loadEnvironment(selectedPath, dependencies.environment)) return failure(10, result);

  const hotelId = dependencies.environment.HOTEL_ID?.trim();
  if (!hotelId) return failure(10, result);

  let runtime: RuntimeDependencies;
  try {
    runtime = await dependencies.loadRuntime();
  } catch {
    return failure(10, result);
  }

  let hotelConfig: Awaited<ReturnType<RuntimeDependencies["getHotelConfig"]>>;
  try {
    hotelConfig = await runtime.getHotelConfig(hotelId);
  } catch {
    return failure(10, result);
  }

  result.configSource = "hotel_config";
  const email = hotelConfig?.channelConfigs?.email;
  if (!validEmailConfig(email)) return failure(10, result);

  const credentials = runtime.resolveEmailCredentials(email, dependencies.environment);
  if (!credentials || credentials.source === "none" || !credentials.pass) {
    return failure(10, result);
  }

  result.primaryCredentialSource = primarySource(credentials);
  result.effectiveCredentialSource = result.primaryCredentialSource;

  let effectivePassword = credentials.pass;
  result.imap = await checkImap(email, effectivePassword, dependencies.connectImap);

  if (result.imap.authentication === "FAIL" && credentials.source === "inline") {
    const fallbackPassword = dependencies.environment.EMAIL_PASS;
    if (fallbackPassword && fallbackPassword !== credentials.pass) {
      effectivePassword = fallbackPassword;
      result.effectiveCredentialSource = "email_pass_fallback";
      result.imap = await checkImap(email, effectivePassword, dependencies.connectImap);
    }
  }

  result.smtp = await checkSmtp(email, effectivePassword, dependencies.createSmtpTransport);
  result.ok = result.imap.connectivity === "PASS"
    && result.imap.authentication === "PASS"
    && result.smtp.connectivity === "PASS"
    && result.smtp.authentication === "PASS";

  if (result.imap.connectivity !== "PASS") return failure(20, result);
  if (result.imap.authentication !== "PASS") return failure(21, result);
  if (result.smtp.connectivity !== "PASS") return failure(30, result);
  if (result.smtp.authentication !== "PASS") return failure(31, result);
  return { exitCode: 0, result };
}

function defaultDependencies(): ConnectivityProbeDependencies {
  return {
    environment: process.env,
    cwd: process.cwd(),
    pathExists: existsSync,
    loadEnvironment: (selectedPath, environment) => {
      const loaded = dotenv.config({
        path: selectedPath,
        processEnv: environment as Record<string, string>,
        override: false,
        quiet: true,
      });
      return !loaded.error;
    },
    loadRuntime: async () => {
      const [{ getHotelConfig }, { resolveEmailCredentials }] = await Promise.all([
        import("@/lib/config/hotelConfig.server"),
        import("@/lib/email/resolveEmailCredentials"),
      ]);
      return { getHotelConfig, resolveEmailCredentials };
    },
    connectImap: (config) => imaps.connect(config as Parameters<typeof imaps.connect>[0]),
    createSmtpTransport: (config) => nodemailer.createTransport(config as Parameters<typeof nodemailer.createTransport>[0]),
  };
}

export function formatConnectivityProbeResult(result: ConnectivityProbeResult): string {
  return JSON.stringify(result);
}

async function cliMain(): Promise<void> {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
  console.log = () => undefined;
  console.info = () => undefined;
  console.warn = () => undefined;
  console.error = () => undefined;

  let execution: ConnectivityProbeExecution;
  try {
    execution = await executeConnectivityProbe(defaultDependencies());
  } catch {
    execution = failure(40, emptyResult());
  } finally {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }

  process.stdout.write(`${formatConnectivityProbeResult(execution.result)}\n`);
  process.exitCode = execution.exitCode;
}

const directInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (directInvocation) {
  void cliMain();
}
