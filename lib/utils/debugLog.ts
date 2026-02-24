// lib/utils/debugLog.ts

import fs from "fs";
import path from "path";

const ALLOWED_TAGS: string[] = [];
// TRACE para confirmar que este módulo se está cargando en runtime
try {
  console.warn("[debugLog] TRACE module loaded (log.txt writer active)");
} catch {}
// const ALLOWED_TAGS: string[] = ["[RESERVATION]"];
export function debugLog(...args: any[]) {
  if (process.env.DEBUG === "true") {
    const msg = args.map(String).join(" ");
    if (ALLOWED_TAGS.length === 0 || ALLOWED_TAGS.some(tag => msg.includes(tag))) {
      console.log("🐞 DEBUG:", ...args);
      logToFile("debug", ...args);
    }
  }
}


// 📁 Ruta absoluta al archivo de log
const logPath = path.join(process.cwd(), "log.txt");

// 📝 Función para escribir en log.txt con marca temporal
function writeLog(type: "warn" | "error" | "debug", ...args: any[]) {
  const time = new Date().toISOString();
  const msg = args.map((a) =>
    typeof a === "object" ? JSON.stringify(a, null, 2) : String(a)
  );
  const full = `[${time}] [${type.toUpperCase()}] ${msg.join(" ")}\n`;

  try {
    fs.appendFileSync(logPath, full);
  } catch (err) {
    console.error("❌ Error writing to log file:", err);
  }
}

// 🛑 Redefinir console.warn y console.error, pero también mostrar en consola
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args) => {
  writeLog("warn", ...args);
  originalWarn(...args);
};
console.error = (...args) => {
  writeLog("error", ...args);
  originalError(...args);
};

// ✅ También exportás la función si querés loguear manualmente
export async function logToFile(type: "warn" | "error" | "debug", ...args: any[]) {
  writeLog(type, ...args);
}

