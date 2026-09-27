import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: false,
    hmr: {
      overlay: true,
    },
  },
  preview: {
    port: 4173,
    host: true,
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "zod",
      "clsx",
      "tailwind-merge",
      "lucide-react",
      "date-fns",
      "recharts",
      "framer-motion",
      "react-hook-form",
      "@hookform/resolvers",
      "class-variance-authority",
    ],
    exclude: [],
  },
  build: {
    target: "es2020",
    outDir: "dist",
    sourcemap: true,
    // Use the bundler's built-in minifier. `minify: "terser"` requires
    // terser as a separate install and was aborting the build.
    minify: true,
    cssMinify: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Rolldown (Vite 8) only accepts the function form of manualChunks;
        // the previous object form aborted the build with
        // "manualChunks is not a function".
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;

          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
            return "vendor";
          }
          if (id.includes("@supabase")) return "supabase";
          if (/[\\/]node_modules[\\/](lucide-react|clsx|tailwind-merge|class-variance-authority)[\\/]/.test(id)) {
            return "ui";
          }
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (/[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id)) return "forms";
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) {
            return "motion";
          }
          if (/[\\/]node_modules[\\/](date-fns|zustand)[\\/]/.test(id)) return "utils";
          return undefined;
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split("/").pop()
            : "chunk";
          return `assets/[name]-[hash].js`;
        },
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  define: {
    "process.env": {},
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
