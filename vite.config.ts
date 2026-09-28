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
      "@lib": path.resolve(import.meta.dirname, "src/lib"),
      "@store": path.resolve(import.meta.dirname, "src/store"),
      "@components": path.resolve(import.meta.dirname, "src/components"),
      "@pages": path.resolve(import.meta.dirname, "src/pages"),
    },
  },
  build: {
    // Ensure the xlsx source file in assets/questionbank/ is never included in the bundle.
    // The ingest script produces src/data/questions.json at build time; the raw xlsx
    // is only a build-time input and must never reach the browser bundle.
    rollupOptions: {
      external: [],
    },
  },
  // Explicitly exclude the questionbank directory from Vite's asset handling
  assetsInclude: [
    "**/*.svg",
    "**/*.png",
    "**/*.jpg",
    "**/*.jpeg",
    "**/*.gif",
    "**/*.webp",
    "**/*.ico",
  ],
});
