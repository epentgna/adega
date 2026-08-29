import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Em produção o app é servido em https://<user>.github.io/adega/.
// Em desenvolvimento (npm run dev) fica na raiz.
export default defineConfig(({ command }) => {
  const base = command === 'build' ? '/adega/' : '/'
  return {
    base,
    define: {
      // Carimbo da versão publicada — aparece em Configurações e serve para
      // saber se o aparelho já pegou o build novo.
      __BUILD__: JSON.stringify(
        new Date().toISOString().slice(0, 16).replace('T', ' ')
      )
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Adega',
          short_name: 'Adega',
          description:
            'Catálogo, gestão e cardápio da sua adega de vinhos. Funciona offline.',
          lang: 'pt-BR',
          theme_color: '#0F0A0C',
          background_color: '#0F0A0C',
          display: 'standalone',
          orientation: 'portrait',
          start_url: base,
          scope: base,
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          navigateFallback: `${base}index.html`,
          cleanupOutdatedCaches: true,
          // O bundle do SDK da Anthropic passa do limite padrão de 2 MB.
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024
        },
        devOptions: { enabled: false }
      })
    ]
  }
})
