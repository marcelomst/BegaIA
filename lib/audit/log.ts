// /lib/audit/log.ts
const DBG = process.env.DEBUG_BEGA === "1";

export const dbg = (...a: any[]) => {
  if (!DBG) return;
  console.debug("[AUDIT]", ...a);
};
