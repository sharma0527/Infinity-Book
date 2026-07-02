import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001/infinity-ai-e26ac/us-central1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chat/, '/streamChat'),
      }
    }
  }
})
