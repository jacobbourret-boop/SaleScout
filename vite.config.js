import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    proxy: {
      "/api": "http://127.0.0.1:5173",
      "/uploads": "http://127.0.0.1:5173"
    }
  },
  build: {
    target: "es2022",
    sourcemap: false
  }
});
