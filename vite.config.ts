import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// 读取 package.json 版本号，注入到渲染进程
const pkgPath = new URL('./package.json', import.meta.url)
const appVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')).version

// 移除 vendor-charts 的 modulepreload 标签，让它真正按需加载
function removeChartsPreloadPlugin() {
  return {
    name: 'remove-vendor-charts-preload',
    // writeBundle 在 dist/ 写入完成后触发
    writeBundle: () => {
      const htmlPath = path.resolve('dist/index.html')
      if (fs.existsSync(htmlPath)) {
        const html = fs.readFileSync(htmlPath, 'utf-8')
        const cleaned = html.replace(
          /<link[^>]+rel=["']modulepreload["'][^>]*href=["'][^"']*vendor-charts[^"']*["'][^>]*>\s*\n?/gi,
          ''
        )
        if (cleaned !== html) {
          fs.writeFileSync(htmlPath, cleaned, 'utf-8')
          console.log('✓ 已移除 vendor-charts 的 preload 标签')
        }
      }
    }
  }
}


// 读取 package.json 版本号, 注入到 index.html 的 window.__APP_VERSION__ 占位符
function injectVersionPlugin() {
  return {
    name: 'inject-app-version',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const placeholder = /window\.__APP_VERSION__\s*=\s*['"]<APP_VERSION>['"]/;
        if (placeholder.test(html)) {
          return html.replace(placeholder, `window.__APP_VERSION__ = '${appVersion}'`);
        }
        return html;
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    removeChartsPreloadPlugin(),
    injectVersionPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  // 开发服务器配置
  server: {
    port: 5173,
    strictPort: true,
    // 代理 /api/* 请求到 C# 后端，解决浏览器预览环境跨域/网络限制
    proxy: {
      '/api': {
        target: 'http://localhost:5048',
        changeOrigin: true,
      },
    },
  },
  // Tauri 需要相对路径
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Tauri 支持的目标
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react'
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-animation'
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons'
          }
          if (id.includes('node_modules')) {
            const match = id.match(/node_modules\/([^/]+)/)
            if (match) {
              return `vendor-${match[1]}`
            }
          }
        },
      },
    },
    minify: 'terser',
  },
  css: {
    minify: 'esbuild',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'E:/eg-coverage',
      include: [
        'src/utils/**',
        'src/types/guards',
        'src/types/permissions.ts',
        'src/store/**',
        'src/components/features/**',
      ],
    },
    exclude: ['node_modules/**', 'dist/**', 'src-tauri/**', 'e2e/**'],
    server: {
      deps: {
        inline: ['@testing-library/user-event']
      }
    }
  }
})
