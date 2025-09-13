// /lib/audit/log.ts
const DBG = process.env.DEBUG_BEGA === "1";
export const dbg = (...a: any[]) => { if (DBG) console.debug("[AUDIT]", ...a); };
