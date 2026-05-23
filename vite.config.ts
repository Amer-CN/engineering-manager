import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import renderer from 'vite-plugin-electron-renderer'
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

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        onstart(options) {
          delete process.env.NODE_OPTIONS
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['better-sqlite3']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer(),
    removeChartsPreloadPlugin(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
        'electron/sqlite/queries/**',
      ],
    },
    exclude: ['node_modules/**', 'dist/**', 'dist-electron/**', 'electron/ipc-handlers/**', 'electron/sqlite/db-init.ts', 'electron/sqlite/migrate.ts', 'electron/sqlite/index.ts'],
    server: {
      deps: {
        inline: ['@testing-library/user-event']
      }
    }
  }
})
