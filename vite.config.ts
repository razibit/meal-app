import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.svg', 'icon-512.svg', 'badge-72.svg'],
      manifest: {
        name: 'Mess Meal Management',
        short_name: 'Mess Meals',
        description: 'Manage daily meals for your boarding mess',
        theme_color: '#5B4B8A',
        background_color: '#5B4B8A',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 3000000
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    }),
    // Bundle analyzer - only in analyze mode
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }) as any,
  ],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'], // Remove specific console methods
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor libraries for better caching
          if (id.includes('node_modules')) {
            // React and related libraries
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'supabase-vendor';
            }
            // Zustand
            if (id.includes('zustand')) {
              return 'state-vendor';
            }
            // Workbox for PWA
            if (id.includes('workbox')) {
              return 'workbox-vendor';
            }
            // All other vendor code
            return 'vendor';
          }
        },
        // Optimize chunk names
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
      // Tree-shaking optimization
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 500,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Source maps for production debugging (optional, increases size)
    sourcemap: false,
    // Optimize asset inlining
    assetsInlineLimit: 4096, // 4kb
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', '@supabase/supabase-js'],
    exclude: ['workbox-window'],
  },
  server: {
    port: 3000,
    hmr: {
      overlay: false
    }
  }
});
