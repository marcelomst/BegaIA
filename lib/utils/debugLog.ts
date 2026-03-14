// lib/utils/debugLog.ts

import fs from "fs";
import path from "path";

const ALLOWED_TAGS: string[] = [];
const logPath = path.join(process.cwd(), "log.txt");

type LogType = "log" | "info" | "warn" | "error" | "debug";

const originalLog = console.log.bind(console);
const originalInfo = (console.info || console.log).bind(console);
const originalWarn = console.warn.bind(console);
const originalError = console.error.bind(console);

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
    originalError("❌ Error writing to log file:", err);
  }
}

function mirrorConsole(type: Exclude<LogType, "debug">, originalFn: (...args: any[]) => void) {
  return (...args: any[]) => {
    writeLog(type, ...args);
    originalFn(...args);
  };
}

console.log = mirrorConsole("log", originalLog);
console.info = mirrorConsole("info", originalInfo);
console.warn = mirrorConsole("warn", originalWarn);
console.error = mirrorConsole("error", originalError);

try {
  console.warn("[debugLog] TRACE module loaded (log.txt writer active)");
} catch {}

export function debugLog(...args: any[]) {
  if (
    process.env.DEBUG === "true" ||
    process.env.DEBUG_ROUTING === "1" ||
    process.env.DEBUG_ROUTING === "true"
  ) {
    const msg = args.map(String).join(" ");
    if (ALLOWED_TAGS.length === 0 || ALLOWED_TAGS.some(tag => msg.includes(tag))) {
      originalLog("🐞 DEBUG:", ...args);
      writeLog("debug", "🐞 DEBUG:", ...args);
    }
  }
}

export async function logToFile(type: LogType, ...args: any[]) {
  writeLog(type, ...args);
}
