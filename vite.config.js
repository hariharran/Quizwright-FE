import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In production the FastAPI service serves this build from the same origin, so
// the app calls relative paths. In dev the API lives on another port, so those
// same paths are proxied instead of switching base URLs between environments.
const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:8123'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: Object.fromEntries(
      ['/health', '/ingest', '/lessons', '/generate-quiz', '/debug'].map((path) => [
        path,
        { target: API_TARGET, changeOrigin: true },
      ]),
    ),
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
