import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 2200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@dimforge") || id.includes("rapier")) return "rapier";
          if (id.includes("three") || id.includes("@react-three")) return "three";
          if (id.includes("/react/") || id.includes("react-dom") || id.includes("scheduler")) return "react";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    hmr: {
      overlay: false,
    },
  },
});

