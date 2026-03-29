import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("xlsx")) {
            return "spreadsheets";
          }

          if (id.includes("@supabase")) {
            return "supabase";
          }

          return "vendor";
        }
      }
    }
  },
  server: {
    port: 5173
  }
});
