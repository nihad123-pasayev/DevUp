import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['snack-sdk'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/snack-sdk/, /node_modules/],
    },
  },
})