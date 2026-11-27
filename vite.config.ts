/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相対パスで書き出す（GitHub Pages の /aki-pet-prototype/ 配下でも、ほかの置き場所でもそのまま動く）
  base: './',
  plugins: [react()],
  // アプリ本体（index）と、公開版のアセットギャラリー（gallery。本体からはリンクしない）の 2 入口
  build: {
    rollupOptions: {
      input: { index: 'index.html', gallery: 'gallery.html' },
    },
  },
  server: { port: 5320, host: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
