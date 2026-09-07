import { defineConfig } from "vitest/config";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["client/src/game/**/*.ts"],
      exclude: ["client/src/game/**/*.tsx"],
    },
  },
  resolve: {
    alias: [
      { find: "@cs-game/shared/proceduralRng", replacement: path.resolve(__dirname, "shared/proceduralRng.ts") },
      { find: "@cs-game/shared/proceduralMaps", replacement: path.resolve(__dirname, "shared/proceduralMaps.ts") },
      { find: "@cs-game/shared", replacement: path.resolve(__dirname, "shared/index.ts") },
      { find: "@src", replacement: path.resolve(__dirname, "client/src") },
    ],
  },
});
