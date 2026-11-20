import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Deployed at https://<user>.github.io/Habittism
const base = process.env.GITHUB_ACTIONS ? '/Habittism/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts'
            if (id.includes('motion') || id.includes('framer-motion')) return 'motion'
            if (id.includes('react') || id.includes('scheduler')) return 'react'
          }
          return undefined
        },
      },
    },
  },
})
