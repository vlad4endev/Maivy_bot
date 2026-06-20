import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const repoRoot = path.resolve(__dirname, "..");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // convex/_generated lives outside admin/; resolve packages from admin deps
      convex: path.resolve(__dirname, "node_modules/convex"),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
  },
});
