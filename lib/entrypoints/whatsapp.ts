// lib/entrypoints/whatsapp.ts
import dotenv from "dotenv";
dotenv.config();

import { startWhatsappBot } from "../services/whatsapp";

console.log("🚀 Iniciando bot de WhatsApp...");
startWhatsappBot();
