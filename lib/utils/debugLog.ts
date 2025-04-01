// lib/utils/debugLog.ts

export function debugLog(...args: any[]) {
    if (process.env.DEBUG === "true") {
      console.log(...args);
    }
  }
  