// /root/begasist/vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname), // 👈 ahora apunta a /root/begasist
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts",
    testTimeout: 15000,
  },
  esbuild: {
    jsx: "automatic", // esto equivale a jsx: "react-jsx"
  },
});
