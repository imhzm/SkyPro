import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5180,
    strictPort: false,
  },
  build: {
    outDir: 'dist/renderer',
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
})
