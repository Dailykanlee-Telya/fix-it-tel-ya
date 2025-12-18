import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React - keep minimal for first load
          'vendor-react': ['react', 'react-dom'],
          // Router separate for route-based code splitting
          'vendor-router': ['react-router-dom'],
          // Query client
          'vendor-query': ['@tanstack/react-query'],
          // UI components - split into smaller chunks
          'vendor-ui-core': ['@radix-ui/react-dialog', '@radix-ui/react-popover'],
          'vendor-ui-select': ['@radix-ui/react-select', '@radix-ui/react-tabs'],
          'vendor-ui-menu': ['@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip'],
          // Forms
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Charts - loaded only when needed
          'vendor-charts': ['recharts'],
          // Utilities
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 500,
    // Enable source maps for debugging in production
    sourcemap: mode === 'development',
    // Minify for production
    minify: mode === 'production' ? 'esbuild' : false,
    // Target modern browsers for smaller bundle
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
  },
}));
