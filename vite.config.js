import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react()],
  // GitHub Pages needs repo subpath; Netlify/local should stay at root.
  base: process.env.GITHUB_ACTIONS === "true" ? "/GARDEN/" : "/",
}));
