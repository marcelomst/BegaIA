import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app"),
    },
  },
  test: {
    environment: "jsdom", // Simula el DOM para pruebas de React
    globals: true,        // Permite usar "expect" sin importar
    setupFiles: "./vitest.setup.ts", // 👈 Agrega esto
    testTimeout: 15000,// Aumenta el tiempo de espera a 15 segundos
  },
});
