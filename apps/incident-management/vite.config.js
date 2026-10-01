import { defineConfig } from "vite";
export default defineConfig({
  server: {
    port: 4021,
    proxy: {
      "/api": "http://127.0.0.1:4020",
      "/ws": { target: "ws://127.0.0.1:4020", ws: true },
    },
  },
  build: { outDir: "dist" },
});
