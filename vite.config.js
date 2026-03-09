import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/bno-prompt-builder/',
  plugins: [react()],
  define: {
    'import.meta.env.VITE_ANTHROPIC_KEY': JSON.stringify(process.env.VITE_ANTHROPIC_KEY)
  }
})