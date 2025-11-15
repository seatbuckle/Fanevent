import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Forward /api → http://localhost:3000
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: false,
        // ensure the Authorization header passes through
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // nothing special needed, just here if you want to debug
          })
        },
      },
    },
  },
})

