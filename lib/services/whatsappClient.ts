// Path: /root/begasist/lib/services/whatsappClient.ts
import WhatsAppWeb from "whatsapp-web.js"; // CJS → default import
import fs from "node:fs";
import path from "node:path";

const { Client, LocalAuth } = WhatsAppWeb as any;

const HOTEL_ID = process.env.HOTEL_ID || "default";
const AUTH_PATH = process.env.WWEBJS_AUTH_PATH || "/data/wwebjs_auth";
const WWEBJS_DIR = path.join(AUTH_PATH, "WWebJS");

// Asegurar carpetas
for (const p of [AUTH_PATH, WWEBJS_DIR, path.join(WWEBJS_DIR, "Default")]) {
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
    dataPath: AUTH_PATH, // LocalAuth gestiona el perfil en AUTH_PATH/WWebJS
  }),
  puppeteer: {
    headless: true,
    // ⚠️ NO userDataDir si usamos LocalAuth
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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
