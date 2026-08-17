import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import legacy from "@vitejs/plugin-legacy";

export default defineConfig(() => ({
  plugins: [
    react(),
    legacy({
      targets: ["defaults", "not IE 11"],
    }),
  ],
  // Relative asset paths prevent blank pages when host paths differ
  // (e.g. GitHub Pages project URL vs local preview or alternate hosts).
  base: "./",
}));
