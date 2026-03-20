// Path: /home/marcelo/begasist/instrumentation.ts

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  await import("@/lib/utils/debugLog");
}
