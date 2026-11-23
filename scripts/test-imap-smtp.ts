import { constants, existsSync } from "node:fs";
import { open, readlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import imaps from "imap-simple";
import nodemailer from "nodemailer";
import type { EmailConfig } from "@/types/channel";
import type { ResolvedEmailCredentials } from "@/lib/email/resolveEmailCredentials";

type CheckStatus = "PASS" | "FAIL" | "NOT_RUN" | "INCONCLUSIVE";
type EnvironmentSource = "repository_env" | "external_env" | "unselected";
type CredentialSource = "secret_ref" | "inline" | "email_pass_fallback" | "none";
type ExactTargetStatus = "PASS" | "FAIL" | "INCONCLUSIVE";
type ExactTargetProbeResultValue = "PASS" | "AUTH_FAIL" | "INCONCLUSIVE";

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

export type ExactTargetProbeRequest = {
  hotelId: string;
  secretRef: string;
};

export type ExactTargetProbeResult = {
  probeMode: "EXACT_TARGET";
  environmentSource: "external_env";
  primaryCredentialSource: "secret_ref";
  effectiveCredentialSource: "secret_ref";
  fallbackUsed: false;
  imap: {
    connectivity: ExactTargetStatus;
    authentication: ExactTargetStatus;
  };
  smtp: {
    connectivity: ExactTargetStatus;
    authentication: ExactTargetStatus;
  };
  probeResult: ExactTargetProbeResultValue;
};

export type ExactTargetProbeExecution = {
  exitCode: 0 | 21 | 40;
  result: ExactTargetProbeResult;
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
  getHotelEmailConnectionConfig: (hotelId: string) => Promise<EmailConfig | null>;
  resolveEmailCredentials: (
    email: EmailConfig | undefined,
    environment?: Record<string, string | undefined>,
  ) => ResolvedEmailCredentials | undefined;
  emailSecretEnvVarName: (ref: string) => string;
};

export type ConnectivityProbeDependencies = {
  environment: Record<string, string | undefined>;
  cwd: string;
  pathExists: (candidate: string) => boolean;
  loadEnvironment: (selectedPath: string, environment: Record<string, string | undefined>) => boolean;
  readExternalEnvironment: (
    selectedPath: string,
    repositoryRoot: string,
  ) => Promise<Record<string, string | undefined> | null>;
  loadRuntime: () => Promise<RuntimeDependencies>;
  connectImap: (config: unknown) => Promise<ImapConnection>;
  createSmtpTransport: (config: unknown) => SmtpTransport;
};

type SecureEnvironmentFileStat = {
  isFile: () => boolean;
  uid: number;
  mode: number;
};

type SecureEnvironmentFileHandle = {
  fd: number;
  stat: () => Promise<SecureEnvironmentFileStat>;
  readFile: () => Promise<Buffer>;
  close: () => Promise<void>;
};

export type SecureEnvironmentFileDependencies = {
  openFile: (
    selectedPath: string,
    flags: number,
  ) => Promise<SecureEnvironmentFileHandle>;
  openedFilePath: (fileDescriptor: number) => Promise<string>;
  currentUid: () => number | undefined;
  parseEnvironment: (contents: Buffer) => Record<string, string | undefined>;
};

function isPathWithinDirectory(directory: string, candidate: string): boolean {
  const relativePath = path.relative(directory, candidate);
  return relativePath === ""
    || (!path.isAbsolute(relativePath)
      && relativePath !== ".."
      && !relativePath.startsWith(`..${path.sep}`));
}

function containsParentTraversal(candidate: string): boolean {
  return candidate.split(/[\\/]+/u).includes("..");
}

const defaultSecureEnvironmentFileDependencies: SecureEnvironmentFileDependencies = {
  openFile: async (selectedPath, flags) =>
    (await open(selectedPath, flags)) as SecureEnvironmentFileHandle,
  openedFilePath: (fileDescriptor) => readlink(`/proc/self/fd/${fileDescriptor}`),
  currentUid: () => process.getuid?.(),
  parseEnvironment: (contents) => dotenv.parse(contents),
};

export async function readSecureExternalEnvironmentFile(
  selectedPath: string,
  repositoryRoot: string,
  dependencies: SecureEnvironmentFileDependencies =
    defaultSecureEnvironmentFileDependencies,
): Promise<Record<string, string | undefined> | null> {
  if (!path.isAbsolute(selectedPath) || containsParentTraversal(selectedPath)) {
    return null;
  }

  const normalizedRepositoryRoot = path.resolve(repositoryRoot);
  const normalizedSelectedPath = path.normalize(selectedPath);
  if (isPathWithinDirectory(normalizedRepositoryRoot, normalizedSelectedPath)) {
    return null;
  }

  const expectedUid = dependencies.currentUid();
  if (!Number.isInteger(expectedUid) || (expectedUid as number) < 0) {
    return null;
  }

  let fileHandle: SecureEnvironmentFileHandle | undefined;
  let contents: Buffer | undefined;
  try {
    fileHandle = await dependencies.openFile(
      normalizedSelectedPath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    const fileStat = await fileHandle.stat();
    if (
      !fileStat.isFile()
      || fileStat.uid !== expectedUid
      || (fileStat.mode & 0o7777) !== 0o600
    ) {
      return null;
    }

    const openedPath = await dependencies.openedFilePath(fileHandle.fd);
    if (
      !path.isAbsolute(openedPath)
      || containsParentTraversal(openedPath)
      || isPathWithinDirectory(normalizedRepositoryRoot, path.normalize(openedPath))
    ) {
      return null;
    }

    contents = await fileHandle.readFile();
    return dependencies.parseEnvironment(contents);
  } catch {
    return null;
  } finally {
    contents?.fill(0);
    if (fileHandle) {
      try {
        await fileHandle.close();
      } catch {
        // Fail closed without exposing filesystem details.
      }
    }
  }
}

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

function isExplicitAuthenticationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Record<string, unknown>;
  const code = typeof candidate.code === "string" ? candidate.code.toUpperCase() : "";
  const textCode = typeof candidate.textCode === "string" ? candidate.textCode.toUpperCase() : "";
  const responseCode = typeof candidate.responseCode === "number" ? candidate.responseCode : 0;

  return code === "EAUTH"
    || textCode === "AUTHENTICATIONFAILED"
    || responseCode === 535;
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
  options: {
    authenticationError?: (error: unknown) => boolean;
    inconclusiveOnTransportError?: boolean;
  } = {},
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
        servername: email.imapHost,
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
    if ((options.authenticationError ?? isAuthenticationError)(error)) {
      return { connectivity: "PASS", authentication: "FAIL" };
    }
    if (options.inconclusiveOnTransportError) {
      return { connectivity: "INCONCLUSIVE", authentication: "INCONCLUSIVE" };
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
  options: {
    authenticationError?: (error: unknown) => boolean;
    inconclusiveOnTransportError?: boolean;
  } = {},
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
    if ((options.authenticationError ?? isAuthenticationError)(error)) {
      return { connectivity: "PASS", authentication: "FAIL" };
    }
    if (options.inconclusiveOnTransportError) {
      return { connectivity: "INCONCLUSIVE", authentication: "INCONCLUSIVE" };
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

function validEmailConfig(email: EmailConfig | null | undefined): email is EmailConfig {
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

const EXACT_TARGET_HOTEL_ID = "hotel999";
const EXACT_TARGET_SECRET_REF = "demo-hotel999-main";

function emptyExactTargetResult(): ExactTargetProbeResult {
  return {
    probeMode: "EXACT_TARGET",
    environmentSource: "external_env",
    primaryCredentialSource: "secret_ref",
    effectiveCredentialSource: "secret_ref",
    fallbackUsed: false,
    imap: { connectivity: "INCONCLUSIVE", authentication: "INCONCLUSIVE" },
    smtp: { connectivity: "INCONCLUSIVE", authentication: "INCONCLUSIVE" },
    probeResult: "INCONCLUSIVE",
  };
}

function exactTargetFailure(result: ExactTargetProbeResult): ExactTargetProbeExecution {
  const authFailed = result.imap.authentication === "FAIL"
    || result.smtp.authentication === "FAIL";
  return {
    exitCode: authFailed ? 21 : 40,
    result: {
      ...result,
      probeResult: authFailed ? "AUTH_FAIL" : "INCONCLUSIVE",
    },
  };
}

function projectExactTargetEmail(email: EmailConfig, secretRef: string): EmailConfig {
  return {
    dirEmail: email.dirEmail,
    imapHost: email.imapHost,
    imapPort: email.imapPort,
    smtpHost: email.smtpHost,
    smtpPort: email.smtpPort,
    secure: email.secure,
    secretRef,
  } as EmailConfig;
}

export async function executeExactTargetProbe(
  dependencies: ConnectivityProbeDependencies,
  request: ExactTargetProbeRequest,
): Promise<ExactTargetProbeExecution> {
  const result = emptyExactTargetResult();
  if (
    request.hotelId !== EXACT_TARGET_HOTEL_ID
    || request.secretRef !== EXACT_TARGET_SECRET_REF
  ) {
    return exactTargetFailure(result);
  }

  const selector = dependencies.environment.BEGASIST_DEMO_ENV_FILE?.trim();
  if (!selector) return exactTargetFailure(result);

  let selectedEnvironment: Record<string, string | undefined> | null;
  try {
    selectedEnvironment = await dependencies.readExternalEnvironment(
      selector,
      dependencies.cwd,
    );
  } catch {
    return exactTargetFailure(result);
  }
  if (!selectedEnvironment) return exactTargetFailure(result);

  let runtime: RuntimeDependencies;
  try {
    runtime = await dependencies.loadRuntime();
  } catch {
    return exactTargetFailure(result);
  }

  const targetVariable = runtime.emailSecretEnvVarName(EXACT_TARGET_SECRET_REF);
  const selectedValue = selectedEnvironment[targetVariable];
  if (typeof selectedValue !== "string" || selectedValue.length === 0) {
    return exactTargetFailure(result);
  }

  let configuredEmail: Awaited<ReturnType<RuntimeDependencies["getHotelEmailConnectionConfig"]>>;
  try {
    configuredEmail = await runtime.getHotelEmailConnectionConfig(EXACT_TARGET_HOTEL_ID);
  } catch {
    return exactTargetFailure(result);
  }

  if (!validEmailConfig(configuredEmail)) return exactTargetFailure(result);

  const email = projectExactTargetEmail(configuredEmail, EXACT_TARGET_SECRET_REF);
  const resolverEnvironment = { [targetVariable]: selectedValue };
  const credentials = runtime.resolveEmailCredentials(email, resolverEnvironment);
  if (
    !credentials
    || credentials.source !== "env"
    || !credentials.pass
    || credentials.pass !== selectedValue
  ) {
    return exactTargetFailure(result);
  }

  const exactOptions = {
    authenticationError: isExplicitAuthenticationError,
    inconclusiveOnTransportError: true,
  };
  result.imap = await checkImap(
    email,
    credentials.pass,
    dependencies.connectImap,
    exactOptions,
  ) as ExactTargetProbeResult["imap"];
  result.smtp = await checkSmtp(
    email,
    credentials.pass,
    dependencies.createSmtpTransport,
    exactOptions,
  ) as ExactTargetProbeResult["smtp"];

  const passed = result.imap.authentication === "PASS"
    && result.smtp.authentication === "PASS";
  if (!passed) return exactTargetFailure(result);

  return {
    exitCode: 0,
    result: { ...result, probeResult: "PASS" },
  };
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
    readExternalEnvironment: readSecureExternalEnvironmentFile,
    loadRuntime: async () => {
      const [
        { getHotelConfig, getHotelConfigCollection },
        { resolveEmailCredentials, emailSecretEnvVarName },
      ] = await Promise.all([
        import("@/lib/config/hotelConfig.server"),
        import("@/lib/email/resolveEmailCredentials"),
      ]);
      const getHotelEmailConnectionConfig = async (hotelId: string): Promise<EmailConfig | null> => {
        const documents = await getHotelConfigCollection()
          .find(
            { hotelId },
            {
              projection: {
                "channelConfigs.email.dirEmail": 1,
                "channelConfigs.email.imapHost": 1,
                "channelConfigs.email.imapPort": 1,
                "channelConfigs.email.smtpHost": 1,
                "channelConfigs.email.smtpPort": 1,
                "channelConfigs.email.secure": 1,
              },
              limit: 1,
            },
          )
          .toArray();
        return (documents[0]?.channelConfigs?.email as EmailConfig | undefined) ?? null;
      };
      return {
        getHotelConfig,
        getHotelEmailConnectionConfig,
        resolveEmailCredentials,
        emailSecretEnvVarName,
      };
    },
    connectImap: (config) => imaps.connect(config as Parameters<typeof imaps.connect>[0]),
    createSmtpTransport: (config) => nodemailer.createTransport(config as Parameters<typeof nodemailer.createTransport>[0]),
  };
}

export function formatConnectivityProbeResult(result: ConnectivityProbeResult): string {
  return JSON.stringify(result);
}

export function formatExactTargetProbeResult(result: ExactTargetProbeResult): string {
  return [
    `PROBE_MODE=${result.probeMode}`,
    `ENVIRONMENT_SOURCE=${result.environmentSource}`,
    `PRIMARY_CREDENTIAL_SOURCE=${result.primaryCredentialSource}`,
    `EFFECTIVE_CREDENTIAL_SOURCE=${result.effectiveCredentialSource}`,
    `FALLBACK_USED=${String(result.fallbackUsed)}`,
    `IMAP_CONNECTIVITY=${result.imap.connectivity}`,
    `IMAP_AUTHENTICATION=${result.imap.authentication}`,
    `SMTP_CONNECTIVITY=${result.smtp.connectivity}`,
    `SMTP_AUTHENTICATION=${result.smtp.authentication}`,
    `PROBE_RESULT=${result.probeResult}`,
  ].join("\n");
}

function parseExactTargetRequest(args: string[]): ExactTargetProbeRequest | undefined {
  if (args[0] !== "exact-target") return undefined;
  if (args.length !== 3) return { hotelId: "", secretRef: "" };

  const hotelId = args[1]?.match(/^--hotelId=(.*)$/)?.[1] ?? "";
  const secretRef = args[2]?.match(/^--secretRef=(.*)$/)?.[1] ?? "";
  return { hotelId, secretRef };
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

  const exactTargetRequest = parseExactTargetRequest(process.argv.slice(2));
  let execution: ConnectivityProbeExecution | ExactTargetProbeExecution;
  let output: string;
  try {
    if (exactTargetRequest) {
      execution = await executeExactTargetProbe(defaultDependencies(), exactTargetRequest);
      output = formatExactTargetProbeResult(execution.result);
    } else {
      execution = await executeConnectivityProbe(defaultDependencies());
      output = formatConnectivityProbeResult(execution.result);
    }
  } catch {
    if (exactTargetRequest) {
      execution = exactTargetFailure(emptyExactTargetResult());
      output = formatExactTargetProbeResult(execution.result);
    } else {
      execution = failure(40, emptyResult());
      output = formatConnectivityProbeResult(execution.result);
    }
  } finally {
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
  }

  process.stdout.write(`${output}\n`);
  process.exitCode = execution.exitCode;
}

const directInvocation = process.argv[1]
  ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
  : false;

if (directInvocation) {
  void cliMain();
}
