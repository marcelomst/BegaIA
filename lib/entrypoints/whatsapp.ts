// lib/entrypoints/whatsapp.ts
import dotenv from "dotenv";
dotenv.config();

import { startWhatsAppBot } from "../services/whatsapp";

console.log("🚀 Iniciando bot de WhatsApp...");
startWhatsAppBot();
