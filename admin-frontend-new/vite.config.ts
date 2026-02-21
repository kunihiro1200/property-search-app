import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  publicDir: 'public',
  define: {
    // 本番環境では新しいバックエンドURLを強制的に使用
    'import.meta.env.VITE_API_URL': mode === 'production' 
      ? JSON.stringify('https://admin-management-backend.vercel.app/api')
      : JSON.stringify(process.env.VITE_API_URL || 'http://localhost:3001'),
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'query-vendor': ['@tanstack/react-query'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
}));
