import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@smartchip/types": path.resolve(__dirname, "../types/src"),
      "@smartchip/engine/core": path.resolve(__dirname, "../engine/src/core/compute-chips.ts"),
      "@smartchip/engine": path.resolve(__dirname, "../engine/src"),
    },
  },
});
