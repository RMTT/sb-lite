import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
    build: {
    rollupOptions: {
      output: {
        manualChunks: {
            'codemirror-vendor': [
            '@uiw/react-codemirror',
            '@codemirror/lang-json',
            '@codemirror/theme-one-dark'
          ]
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8180',
        changeOrigin: true,
      },
    },
  },
})
