import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/admin/", // URL base for assets (e.g. /admin/assets/xxx.js)
  build: {
    outDir: "../public/admin", // Output to project public/admin/ (not admin-ui/dist)
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
