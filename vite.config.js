import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => ({
  plugins: [react()],
  // Netlify serves this site from the domain root.
  base: "/",
}));
