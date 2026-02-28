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
const WWEBJS_DIR = path.join(dataPath, "WWebJS");
const headless = process.env.WWEBJS_HEADLESS === "0" ? false : true;
const executablePath =
  process.env.WWEBJS_EXECUTABLE_PATH?.trim() ||
  process.env.PUPPETEER_EXECUTABLE_PATH?.trim() ||
  undefined;

// Asegurar carpetas
for (const p of [dataPath, WWEBJS_DIR, path.join(WWEBJS_DIR, "Default")]) {
  try { fs.mkdirSync(p, { recursive: true }); } catch {}
}

// Limpieza defensiva por si hay restos previos (no reemplaza la del compose)
try {
  for (const f of [
    "SingletonLock","SingletonCookie","LOCK","DevToolsActivePort",
    "Default/LOCK","Default/SingletonLock","Default/SingletonCookie","Default/Preferences.lock"
  ]) {
    fs.rmSync(path.join(WWEBJS_DIR, f), { force: true });
  }
} catch {}

export const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    clientId: HOTEL_ID,
    dataPath, // LocalAuth gestiona el perfil en dataPath/WWebJS
  }),
  puppeteer: {
    headless,
    // ⚠️ NO userDataDir si usamos LocalAuth
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--disable-gpu",
    ],
  },
});

// Cierre limpio
process.once("SIGINT", async () => { try { await (whatsappClient as any)?.destroy?.(); } catch {} process.exit(0); });
process.once("SIGTERM", async () => { try { await (whatsappClient as any)?.destroy?.(); } catch {} process.exit(0); });
