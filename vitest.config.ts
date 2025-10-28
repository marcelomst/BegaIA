// Path: /root/begasist/vitest.config.ts
import { defineConfig } from "vitest/config";
const ROOT = process.cwd();

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./test/setup.ts", "./test/frontend/setup.dom.ts"],
    include: [
      "test/**/*.{test,spec}.{ts,tsx}",
      "!test/freezer/e2e.reservation.flow.spec.ts"
    ],
    watch: false,
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      reportsDirectory: "./test/coverage",
      include: ["**/*.{ts,tsx}"],
      exclude: ["test/**", "**/*.d.ts"],
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: ROOT },
      { find: "@/", replacement: ROOT + "/" },
    ],
  },
});
