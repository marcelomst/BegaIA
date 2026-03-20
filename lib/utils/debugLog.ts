// lib/utils/debugLog.ts

import fs from "fs";
import path from "path";

const ALLOWED_TAGS: string[] = [];
const baseDir = process.env.BEGASIST_ROOT || process.env.INIT_CWD || process.cwd();
const logPath = path.join(baseDir, "log.txt");
const DEBUGLOG_CONSOLE_STATE_KEY = "__begasistDebugLogConsoleState__";

type LogType = "log" | "info" | "warn" | "error" | "debug";

type ConsoleFn = (...args: any[]) => void;
type DebugLogConsoleState = {
  installed: boolean;
  traceLogged: boolean;
  originalLog: ConsoleFn;
  originalInfo: ConsoleFn;
  originalWarn: ConsoleFn;
  originalError: ConsoleFn;
  originalDebug: ConsoleFn;
};

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

function serializeArg(arg: any): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) {
    return arg.stack || `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === "object") {
    try {
      return JSON.stringify(arg, null, 2);
    } catch {
      return String(arg);
    }
  }
  return String(arg);
}

function writeLog(type: LogType, ...args: any[]) {
  const time = new Date().toISOString();
  const msg = args.map(serializeArg);
  const full = `[${time}] [${type.toUpperCase()}] ${msg.join(" ")}\n`;

  try {
    fs.appendFileSync(logPath, full);
  } catch (err) {
    consoleState.originalError("❌ Error writing to log file:", err);
  }
}

function mirrorConsole(type: Exclude<LogType, "debug">, originalFn: (...args: any[]) => void) {
  return (...args: any[]) => {
    writeLog(type, ...args);
    originalFn(...args);
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
    writeLog("warn", "[debugLog] TRACE module loaded (log.txt writer active)");
    consoleState.originalWarn("[debugLog] TRACE module loaded (log.txt writer active)");
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
      consoleState.originalLog("🐞 DEBUG:", ...args);
      writeLog("debug", "🐞 DEBUG:", ...args);
    }
  }
}

export async function logToFile(type: LogType, ...args: any[]) {
  writeLog(type, ...args);
}
