// Path: /root/begasist/lib/services/whatsappClient.ts

// Import CJS-friendly
import wwebjs from "whatsapp-web.js";
const { Client, LocalAuth } = wwebjs as typeof import("whatsapp-web.js");

export const whatsappClient = new Client({
  authStrategy: new LocalAuth({
    // Persistencia controlada por wwebjs (aquí guardará sesión y su propio perfil Chromium)
    dataPath: process.env.WWEBJS_AUTH_PATH || "/app/.wwebjs_auth",
    // opcional: por si querés distinguir múltiples instancias
    clientId: process.env.HOTEL_ID || "default",
  }),
  puppeteer: {
    // ⚠️ NO pasar userDataDir aquí (incompatible con LocalAuth)
    headless: true, // en puppeteer-core v18: boolean | "chrome"
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--single-process",
      "--no-zygote",
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, // /usr/bin/chromium-browser en Docker
  },
});
