// lib/utils/debugLog.ts

const ALLOWED_TAGS: string[] = [];
const DEBUGLOG_CONSOLE_STATE_KEY = "__begasistDebugLogConsoleState__";
const REDACTED = "[REDACTED]";

const SENSITIVE_KEYS = new Set([
  "authorization",
  "proxyauthorization",
  "apikey",
  "openaiapikey",
  "xapikey",
  "xgoogapikey",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "authtoken",
  "clientsecret",
  "password",
  "passwd",
  "cookie",
  "setcookie",
  "credential",
  "credentials",
]);

type LogType = "log" | "info" | "warn" | "error" | "debug";

type ConsoleFn = (...args: any[]) => void;
type NodeFsModule = {
  mkdirSync: (path: string, options?: { recursive?: boolean }) => void;
  appendFileSync: (path: string, data: string) => void;
};
type NodePathModule = {
  join: (...paths: string[]) => string;
};
type DebugLogConsoleState = {
  installed: boolean;
  traceLogged: boolean;
  originalLog: ConsoleFn;
  originalInfo: ConsoleFn;
  originalWarn: ConsoleFn;
  originalError: ConsoleFn;
  originalDebug: ConsoleFn;
};

function getNodeLogModules(): { fs: NodeFsModule; path: NodePathModule; logDir: string; logPath: string } | null {
  if (typeof process === "undefined" || !process?.versions?.node) return null;
  try {
    const req = Function("return require")() as (id: string) => any;
    const fs = req("fs") as NodeFsModule;
    const path = req("path") as NodePathModule;
    const baseDir = process.env.BEGASIST_ROOT || process.env.INIT_CWD || process.cwd();
    const logDir = path.join(baseDir, "debug");
    const logPath = path.join(logDir, "log.txt");
    return { fs, path, logDir, logPath };
  } catch {
    return null;
  }
}

function getConsoleState(): DebugLogConsoleState {
  const g = globalThis as typeof globalThis & {
    [DEBUGLOG_CONSOLE_STATE_KEY]?: DebugLogConsoleState;
  };

  if (!g[DEBUGLOG_CONSOLE_STATE_KEY]) {
    g[DEBUGLOG_CONSOLE_STATE_KEY] = {
      installed: false,
      traceLogged: false,
      originalLog: console.log.bind(console),
      originalInfo: (console.info || console.log).bind(console),
      originalWarn: console.warn.bind(console),
      originalError: console.error.bind(console),
      originalDebug: (console.debug || console.log).bind(console),
    };
  }

  return g[DEBUGLOG_CONSOLE_STATE_KEY]!;
}

const consoleState = getConsoleState();

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("accesstoken") ||
    normalized.endsWith("refreshtoken") ||
    normalized.endsWith("clientsecret") ||
    normalized.endsWith("password")
  );
}

function redactSensitiveText(value: string): string {
  return value
    .replace(
      /((?:authorization|proxy[-_ ]?authorization)\s*[:=]\s*)(?:bearer|basic)\s+[^\s,;}\]]+/gi,
      `$1${REDACTED}`
    )
    .replace(
      /((?:authorization|proxy[-_ ]?authorization)\s*[:=]\s*)[^,\r\n;}]+/gi,
      `$1${REDACTED}`
    )
    .replace(
      /(["']?(?:authorization|proxy[-_ ]?authorization|x[-_ ]?api[-_ ]?key|openai[-_ ]?api[-_ ]?key|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|id[-_ ]?token|auth[-_ ]?token|token|client[-_ ]?secret|password|cookie|set[-_ ]?cookie)["']?\s*[:=]\s*)(["'])[^"']*\2/gi,
      `$1$2${REDACTED}$2`
    )
    .replace(
      /([?&](?:api[-_ ]?key|key|access[-_ ]?token|refresh[-_ ]?token|token)=)[^&#\s]+/gi,
      `$1${REDACTED}`
    )
    .replace(/\bsk-[a-z0-9_-]{8,}\b/gi, REDACTED)
    .replace(/\beyJ[a-z0-9_-]{4,}\.[a-z0-9_-]{4,}\.[a-z0-9_-]{4,}\b/gi, REDACTED)
    .replace(/\b(bearer|basic)\s+[a-z0-9._~+/=-]+/gi, `$1 ${REDACTED}`)
    .replace(
      /((?:x[-_ ]?api[-_ ]?key|openai[-_ ]?api[-_ ]?key|api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|id[-_ ]?token|auth[-_ ]?token|token|client[-_ ]?secret|password|cookie|set[-_ ]?cookie)\s*[=:]\s*)[^\s,;}\]]+/gi,
      `$1${REDACTED}`
    )
    .replace(/(https?:\/\/[^:\s/]+:)[^@\s/]+@/gi, `$1${REDACTED}@`);
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return redactSensitiveText(value);
  if (value === null || typeof value === "undefined") return value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") return String(value);
  if (typeof value !== "object") return String(value);

  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return "[Circular]";
  seen.add(value);

  if (typeof Headers !== "undefined" && value instanceof Headers) {
    const safeHeaders: Record<string, unknown> = {};
    value.forEach((headerValue, key) => {
      safeHeaders[key] = isSensitiveKey(key) ? REDACTED : redactSensitiveText(headerValue);
    });
    seen.delete(value);
    return safeHeaders;
  }

  if (typeof Request !== "undefined" && value instanceof Request) {
    const safeRequest = {
      method: value.method,
      url: redactSensitiveText(value.url),
      headers: sanitizeValue(value.headers, seen),
    };
    seen.delete(value);
    return safeRequest;
  }

  if (typeof Response !== "undefined" && value instanceof Response) {
    const safeResponse = {
      status: value.status,
      statusText: redactSensitiveText(value.statusText),
      url: redactSensitiveText(value.url),
      headers: sanitizeValue(value.headers, seen),
    };
    seen.delete(value);
    return safeResponse;
  }

  if (value instanceof Error) {
    const safeError: Record<string, unknown> = {
      name: redactSensitiveText(value.name),
      message: redactSensitiveText(value.message),
    };
    if (value.stack) safeError.stack = redactSensitiveText(value.stack);

    for (const key of Object.keys(value)) {
      if (key === "name" || key === "message" || key === "stack") continue;
      if (isSensitiveKey(key)) {
        safeError[key] = REDACTED;
        continue;
      }
      try {
        safeError[key] = sanitizeValue((value as unknown as Record<string, unknown>)[key], seen);
      } catch {
        safeError[key] = "[Unserializable]";
      }
    }
    seen.delete(value);
    return safeError;
  }

  if (Array.isArray(value)) {
    const safeArray = value.map(item => sanitizeValue(item, seen));
    seen.delete(value);
    return safeArray;
  }

  const safeObject: Record<string, unknown> = {};
  for (const key of Object.keys(value)) {
    if (isSensitiveKey(key)) {
      safeObject[key] = REDACTED;
      continue;
    }
    try {
      safeObject[key] = sanitizeValue((value as Record<string, unknown>)[key], seen);
    } catch {
      safeObject[key] = "[Unserializable]";
    }
  }
  seen.delete(value);
  return safeObject;
}

export function sanitizeForLogging(value: unknown): unknown {
  try {
    return sanitizeValue(value, new WeakSet<object>());
  } catch {
    return "[Unserializable]";
  }
}

function serializeArg(arg: unknown): string {
  const sanitized = sanitizeForLogging(arg);
  if (typeof sanitized === "string") return sanitized;
  if (typeof sanitized === "undefined") return "undefined";
  if (sanitized === null) return "null";
  if (typeof sanitized !== "object") return String(sanitized);
  try {
    return JSON.stringify(sanitized, null, 2);
  } catch {
    return "[Unserializable]";
  }
}

function writeLog(type: LogType, ...args: any[]) {
  const modules = getNodeLogModules();
  if (!modules) return;
  const time = new Date().toISOString();
  const msg = args.map(serializeArg);
  const full = `[${time}] [${type.toUpperCase()}] ${msg.join(" ")}\n`;

  try {
    modules.fs.mkdirSync(modules.logDir, { recursive: true });
    modules.fs.appendFileSync(modules.logPath, full);
  } catch (err) {
    consoleState.originalError("❌ Error writing to log file:", err);
  }
}

function mirrorConsole(type: LogType, originalFn: (...args: any[]) => void) {
  return (...args: any[]) => {
    writeLog(type, ...args);
    originalFn(...args.map(sanitizeForLogging));
  };
}

if (!consoleState.installed) {
  console.log = mirrorConsole("log", consoleState.originalLog);
  console.info = mirrorConsole("info", consoleState.originalInfo);
  console.warn = mirrorConsole("warn", consoleState.originalWarn);
  console.error = mirrorConsole("error", consoleState.originalError);
  console.debug = mirrorConsole("debug", consoleState.originalDebug);
  consoleState.installed = true;
}

if (!consoleState.traceLogged) {
  try {
    writeLog("warn", "[debugLog] TRACE module loaded (debug/log.txt writer active)");
    consoleState.originalWarn("[debugLog] TRACE module loaded (debug/log.txt writer active)");
    consoleState.traceLogged = true;
  } catch {}
}

export function debugLog(...args: any[]) {
  if (
    process.env.DEBUG === "true" ||
    process.env.DEBUG_ROUTING === "1" ||
    process.env.DEBUG_ROUTING === "true"
  ) {
    const msg = args.map(String).join(" ");
    if (ALLOWED_TAGS.length === 0 || ALLOWED_TAGS.some(tag => msg.includes(tag))) {
      consoleState.originalLog("🐞 DEBUG:", ...args.map(sanitizeForLogging));
      writeLog("debug", "🐞 DEBUG:", ...args);
    }
  }
}

export async function logToFile(type: LogType, ...args: any[]) {
  writeLog(type, ...args);
}
