// /root/begasist/lib/auth/tokenUtils.ts
import { randomBytes } from "crypto";

/**
 * Genera un token seguro en formato hexadecimal.
 */
export function generateToken(): string {
  return randomBytes(32).toString("hex");
}
