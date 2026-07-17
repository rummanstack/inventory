import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function manualChunks(id) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
    return 'charts';
  }

  if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('/xlsx/')) {
    return 'export-tools';
  }

  if (id.includes('lucide-react') || id.includes('sonner')) {
    return 'ui-vendor';
  }

  return undefined;
}

export default defineConfig({
  plugins: [react()],
  build: {
    // outDir: '../backend/public/dist',
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
});
