import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Gitee Pages 部署时改为 /仓库名/
  // 本地开发保持 / 即可
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})