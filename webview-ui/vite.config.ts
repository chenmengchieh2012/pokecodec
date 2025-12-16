import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: []
  },
  base: './', // 確保相對路徑正確
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  // 👇 請新增或修改這個區塊
  server: {
    port: 5174,       // 固定 Port，避免它亂跑
    host: 'localhost', 
    cors: true,       // 🔥 關鍵：允許跨域 (CORS)，這樣 VS Code 才能讀取
    origin: 'http://localhost:5174', // 幫助 CSS/Assets 載入正確路徑
    hmr: {
        host: 'localhost', // 確保熱更新連線正確
    }
  },
})