import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png', 'fonts/*.woff2'],
      manifest: {
        name: 'HandBallLab',
        short_name: 'HBL',
        description: 'Live handball scoreboard, tournament tracker, and player profiles',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f1117',
        theme_color: '#6ee7b7',
        orientation: 'portrait',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Only cache static assets — never cache Supabase API calls
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
