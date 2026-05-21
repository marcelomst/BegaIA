// Path: /root/begasist/lib/services/whatsappClient.ts
import WhatsAppWeb from "whatsapp-web.js"; // CJS → default import
import fs from "node:fs";
import path from "node:path";

const { Client, LocalAuth } = WhatsAppWeb as any;

const HOTEL_ID = process.env.HOTEL_ID || "default";
const dataPath =
  process.env.WWEBJS_AUTH_PATH?.trim()
    ? process.env.WWEBJS_AUTH_PATH.trim()
    : path.join(process.cwd(), ".local", "wwebjs_auth");
const sessionDir = path.join(dataPath, `session-${HOTEL_ID}`);
const legacyWWebJsDir = path.join(dataPath, "WWebJS");
const headless = process.env.WWEBJS_HEADLESS === "0" ? false : true;
const executablePath =
  process.env.WWEBJS_EXECUTABLE_PATH?.trim() ||
  process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
  undefined;
const webCachePath =
  process.env.WWEBJS_CACHE_PATH?.trim()
    ? process.env.WWEBJS_CACHE_PATH.trim()
    : path.join(process.cwd(), ".local", "wwebjs_cache");
const dumpio = process.env.WWEBJS_DUMPIO === "1";
const webVersion = process.env.WWEBJS_WEB_VERSION?.trim() || undefined;
const webCacheType = process.env.WWEBJS_WEB_CACHE_TYPE?.trim() === "remote" ? "remote" : "local";
const webVersionRemotePath =
  process.env.WWEBJS_WEB_VERSION_REMOTE_PATH?.trim() ||
  "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html";

// Asegurar carpetas. LocalAuth usa dataPath/session-<clientId> como userDataDir real.
for (const p of [dataPath, sessionDir, webCachePath]) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

// Limpieza defensiva por si hay restos previos (no reemplaza la del compose).
// Se limpia el perfil real de LocalAuth y el path legacy WWebJS si existe.
try {
  for (const base of [sessionDir, legacyWWebJsDir]) {
    for (const f of [
      "SingletonLock","SingletonCookie","LOCK","DevToolsActivePort",
      "Default/LOCK","Default/SingletonLock","Default/SingletonCookie","Default/Preferences.lock"
    ]) {
      fs.rmSync(path.join(base, f), { force: true });
    }
  }
} catch {}

console.log("[whatsappClient] LocalAuth config", {
  hotelId: HOTEL_ID,
  dataPath,
  sessionDir,
  webCachePath,
  webVersion: webVersion || null,
  webCacheType,
  webVersionRemotePath: webCacheType === "remote" ? webVersionRemotePath : null,
  headless,
  dumpio,
  executablePath: executablePath || null,
});

export const whatsappClient = new Client({
  ...(webVersion ? { webVersion } : {}),
  webVersionCache: webCacheType === "remote"
    ? {
        type: "remote",
        remotePath: webVersionRemotePath,
        strict: false,
      }
    : {
        type: "local",
        path: webCachePath,
        strict: false,
      },
  authStrategy: new LocalAuth({
    clientId: HOTEL_ID,
    dataPath, // LocalAuth gestiona el perfil en dataPath/session-<clientId>
  }),
  puppeteer: {
    headless,
    dumpio,
    // ⚠️ NO userDataDir si usamos LocalAuth
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-breakpad",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-gpu",
      "--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints",
      "--disable-ipc-flooding-protection",
      "--disable-renderer-backgrounding",
      "--metrics-recording-only",
      "--mute-audio",
    ],
  },
});

// Cierre limpio
process.once("SIGINT", async () => { try { await (whatsappClient as any)?.destroy?.(); } catch {} process.exit(0); });
process.once("SIGTERM", async () => { try { await (whatsappClient as any)?.destroy?.(); } catch {} process.exit(0); });
