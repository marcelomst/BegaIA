import { Client } from "whatsapp-web.js";
import puppeteer from "puppeteer";

export const whatsappClient = new Client({
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: puppeteer.executablePath(), // 👈 Esto es lo clave
  },
});
