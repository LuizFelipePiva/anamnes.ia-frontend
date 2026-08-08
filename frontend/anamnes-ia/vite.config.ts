import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],

  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './src/app'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/config': path.resolve(__dirname, './src/config'),
      '@/assets': path.resolve(__dirname, './src/assets'),
    }
  },
  
  preview: {
    allowedHosts: process.env.VITE_PREVIEW_HOST
      ? process.env.VITE_PREVIEW_HOST.split(",").map((h) => h.trim())
      : [],
  },
  
  // Configuração para múltiplos entry points
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        // Preview apenas em desenvolvimento - não builda em produção
        ...(process.env.NODE_ENV !== 'production' && {
          preview: './index.preview.html'
        })
      }
    }
  }
})