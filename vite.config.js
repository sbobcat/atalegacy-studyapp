import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "node:fs";
// Base path for subdirectory hosting (e.g. GitHub Pages).
// Set VITE_BASE_PATH to '/' for local root hosting.
const base = process.env.VITE_BASE_PATH ?? "/atalegacy-studyapp/";
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
// https://vitejs.dev/config/
export default defineConfig({
  base,
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(version.split(".").slice(0, 2).join(".")),
    "import.meta.env.VITE_APP_UPDATED_DATE": JSON.stringify(new Date().toISOString().slice(0, 10)),
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@lib": path.resolve(__dirname, "src/lib"),
      "@store": path.resolve(__dirname, "src/store"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
    },
  },
  build: {
    // Ensure the xlsx source file in assets/ is never included in the bundle
    rollupOptions: {
      external: [],
    },
  },
});
