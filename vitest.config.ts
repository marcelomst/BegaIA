// Path: /root/begasist/vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.{test,spec}.{ts,tsx}"],
    watch: false,
    pool: "threads",
    coverage: {
      reporter: ["text", "html"],
      reportsDirectory: "./test/coverage",
      include: ["**/*.{ts,tsx}"],
      exclude: ["test/**", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: {
      "@/": "/root/begasist/",
    },
  },
});
