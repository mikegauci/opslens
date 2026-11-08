import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      input: ["index.html", "runtime-legacy.html", "runtime-react.html"].map(
        (file) => fileURLToPath(new URL(file, import.meta.url)),
      ),
    },
  },
  server: { proxy: { "/api": "http://127.0.0.1:3000" } },
});
