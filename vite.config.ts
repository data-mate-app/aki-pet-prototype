/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 相対パスで書き出す（GitHub Pages の /aki-pet-prototype/ 配下でも、ほかの置き場所でもそのまま動く）
  base: './',
  plugins: [react()],
  // アプリ本体（index）、公開版のアセットギャラリー（gallery）、横スクロールの「へや」別案（side-room）の 3 入口。
  // gallery と side-room は本体からリンクしない（URL を直接開く）
  build: {
    rollupOptions: {
      input: { index: 'index.html', gallery: 'gallery.html', 'side-room': 'side-room.html' },
    },
  },
  server: { port: 5320, host: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
