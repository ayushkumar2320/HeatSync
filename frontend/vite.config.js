import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
  exclude: ["maplibre-gl"],
  },

  server: {
    host: 'localhost',
    port: 5173,
    // In development the frontend calls the FastAPI backend through this
    // proxy (same-origin /api requests), which avoids CORS entirely.
    // Production builds keep using VITE_BACKEND_API_URL / localhost:8000.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
    hmr: {
      // Do NOT hardcode host/port here — let Vite auto-detect from
      // window.location so HMR works regardless of whether the dev server
      // is accessed via localhost, 127.0.0.1, or a network IP.
    },
  },
})