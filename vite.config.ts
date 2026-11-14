/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { theme } from './src/theme.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // 새 버전을 배포하면 다음에 열 때 자동 업데이트
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: theme.appName,
        short_name: theme.appName,
        lang: 'ko',
        display: 'standalone',
        start_url: '/',
        theme_color: theme.primary,
        background_color: theme.background,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 앱 화면(코드·글꼴·아이콘)을 기기에 저장
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        // 커플 사진도 한 번 받으면 기기에 저장 → 오프라인에서도 보임 (일정 데이터는 앱이 따로 저장)
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/sign/covers/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'cover-photo',
              expiration: { maxEntries: 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
})
