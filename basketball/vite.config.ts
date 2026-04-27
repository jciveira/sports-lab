import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png', 'fonts/*.woff2'],
      manifest: {
        name: 'BasketballLab',
        short_name: 'BasketLab',
        description: 'Live basketball scoreboard, tournament tracker, and player profiles',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1117',
        theme_color: '#f97316',
        orientation: 'portrait',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.(co|in)\/.*/i,
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
})
