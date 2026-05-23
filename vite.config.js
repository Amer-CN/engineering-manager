import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';
export default defineConfig({
    plugins: [
        react(),
        electron([
            {
                entry: 'electron/main.ts',
                onstart: function (options) {
                    // 清除 NODE_OPTIONS 中可能包含 Electron 不支持的选项（如 --use-system-ca）
                    delete process.env.NODE_OPTIONS;
                    // 启动 Electron 并传递开发服务器 URL
                    options.startup();
                },
                vite: {
                    build: {
                        outDir: 'dist-electron',
                        rollupOptions: {
                            external: ['better-sqlite3', 'electron']
                        }
                    }
                }
            },
            {
                entry: 'electron/preload.ts',
                onstart: function (options) {
                    // 通知渲染进程重新加载（连接到开发服务器）
                    options.reload();
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
        renderer()
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
                manualChunks: {
                    'vendor-react': ['react', 'react-dom'],
                    'vendor-animation': ['framer-motion'],
                    'vendor-charts': ['recharts'],
                    'vendor-icons': ['lucide-react'],
                },
            },
        },
    },
    test: {
        // 测试环境：jsdom 支持 DOM API
        environment: 'jsdom',
        // 全局 setup 文件
        setupFiles: ['./src/test-setup.ts'],
        // 路径别名与主项目一致
        alias: {
            '@': path.resolve(__dirname, 'src')
        },
        // 全局 API（describe/it/expect 无需 import）
        globals: true,
        // 覆盖率配置
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/utils/**', 'src/types/guards.ts', 'src/types/permissions.ts', 'src/store/**'],
        },
        // 排除 Electron 主进程代码
        exclude: ['electron/**', 'node_modules/**', 'dist/**', 'dist-electron/**'],
        // SSR 相关：Electron 模块不需要在测试中加载
        server: {
            deps: {
                inline: ['@testing-library/user-event']
            }
        }
    }
});
