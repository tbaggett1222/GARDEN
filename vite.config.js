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
  // GitHub Pages needs repo subpath; Netlify/local should stay at root.
  base: process.env.GITHUB_ACTIONS === "true" ? "/GARDEN/" : "/",
}));
