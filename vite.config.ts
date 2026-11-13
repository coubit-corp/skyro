import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Skyro',
        short_name: 'Skyro',
        description: 'Sua rotina acompanhada de verdade pelo profissional que cuida de você.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#F1F4FC',
        theme_color: '#1C2A4D',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Dados do Supabase nunca ficam em cache: só os arquivos do app.
        navigateFallbackDenylist: [/^\/auth\//],
      },
    }),
  ],
})
