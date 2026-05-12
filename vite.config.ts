import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  optimizeDeps: {
    include: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-dom") || id.match(/[\\/]react[\\/]/) || id.includes("scheduler") || id.includes("react/jsx") ) return "react-vendor";
          if (id.includes("react-router")) return "router-vendor";
          if (id.includes("@tanstack")) return "query-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@radix-ui")) return "radix-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("date-fns")) return "date-vendor";
          if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) return "form-vendor";
          return "vendor";
        },
      },
    },
  },
}));
