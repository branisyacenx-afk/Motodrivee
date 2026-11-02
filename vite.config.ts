import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// GitHub Pages serves this repository from /Motodrivee/.
// Other hosts (Netlify/Vercel/custom domains) continue to use the root path.
const base = process.env.GITHUB_ACTIONS === 'true' ? '/Motodrivee/' : '/';

// https://vitejs.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
