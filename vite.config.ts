import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.HABITTISM_BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
  },
})
