// Path: /root/begasist/lib/utils/debugLogger.ts

import fs from "fs";
import path from "path";

const DEBUG_LOG_PATH = path.join(process.cwd(), "debug", "classifier_input_log.txt");

export function logQuestionForDebugging({
  hotelId,
  channel,
  from,
  rawInput,
  cleanedInput,
}: {
  hotelId: string;
  channel: string;
  from?: string;
  rawInput: string;
  cleanedInput: string;
}) {
  const timestamp = new Date().toISOString();
//   const entry = `
// [${timestamp}] Hotel: ${hotelId} | Canal: ${channel}${from ? ` | Remitente: ${from}` : ""}
// → Original: ${rawInput}
// → Limpia:   ${cleanedInput}
// ---`.trim();
  const entry = `
[${timestamp}] Hotel: ${hotelId} | Canal: ${channel}${from ? ` | Remitente: ${from}` : ""}
→ Limpia:   ${cleanedInput}
---`.trim();


  try {
    fs.mkdirSync(path.dirname(DEBUG_LOG_PATH), { recursive: true });
    fs.appendFileSync(DEBUG_LOG_PATH, entry + "\n\n");
  } catch (err) {
    console.error("🛑 No se pudo escribir log de depuración:", err);
  }
}
