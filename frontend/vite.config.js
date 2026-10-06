import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      // In development the browser talks to "/api" on this same address and Vite forwards it to your backend.
      proxy: {
        "/api": {
          target: env.VITE_DEV_API_TARGET || "http://localhost:5000",
          changeOrigin: true,
        },
      },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            charts: ["chart.js", "react-chartjs-2"],
          },
        },
      },
    },
  };
});
