import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    react(),
    build({
      entry: 'src/index.tsx'
    }),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    outDir: 'dist',
    // ビルドパフォーマンス最適化
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    // Cloudflare Workers用: チャンク分割を無効化
    rollupOptions: {
      output: {
        inlineDynamicImports: false
      }
    }
  },
  publicDir: 'public',
  // 最適化設定
  optimizeDeps: {
    include: ['hono', 'react', 'react-dom']
  },
  esbuild: {
    target: 'esnext',
    treeShaking: true
  }
})
