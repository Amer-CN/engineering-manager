# 项目清理清单

> 按「绝对安全 → 可选删除」排列

---

## ✅ 绝对安全（项目已弃用，无任何引用）

| 项目 | 大小 | 说明 |
|------|:---:|------|
| **`electron/`** | ~20 KB | Electron 后端代码（IPC handlers + preload），已完全被 C# API 替代 |
| **`monitor*.bat`** (8个) | ~5 KB | Electron 控制台监控脚本，已无用 |
| **`monitor*.ps1`** (8个) | | 同上 |
| **`claude-dashboard/`** | 0 B | **空目录** |
| **`sleep-study.html`** | ~1 KB | Windows 电源报告文件，跟项目无关 |
| **`terminal-monitor.log`** | 48 KB | 调试日志，可删 |
| **`dist/`** | ~5 MB | Vite 编译产物，可重新生成 |
| **`__tests__/`** | ~1 MB | 前端的测试文件，仍是 Tauri/Electron 时代的 mock，新 C# 版本用不上 |
| **`.codex/`** | ~1 KB | Codex CLI 配置，你已不用 |

### 脚本目录中的废弃

| 项目 | 说明 |
|------|------|
| `scripts/create-seed-data.js` | Electron 种子数据生成 |
| `scripts/prebuild-nsis.js` | Electron NSIS 安装包配置 |
| `scripts/generate-installer-assets.js` | 安装包资源 |
| `scripts/remove-charts-preload.js` | Electron 预加载脚本 |
| `scripts/generate-test-skeleton.js` | Electron 测试骨架 |
| `scripts/fix_*.py`（9个） | TypeScript 错误修复脚本，对你用 C# 无用 |
| `scripts/graphify-monthly-extract.ps1` | graphify 定时任务（你从没用过） |

## ⚠️ 可选删除

| 项目 | 大小 | 理由 |
|------|:---:|------|
| **`graphify-out/`** | 83 MB | 知识图谱数据，你之前说从没用上过 |
| **`logo-concepts/`** | ~1 MB | Logo 设计稿，跟代码无关，可备份后删 |
| **`.workbuddy/`** | ~5 MB | 旧工具配置，你已不用 |
| **`安装运行指南.md`** | ~3 KB | 需要更新为 C# 版本的启动方式 |

## ❌ 不能删

| 项目 | 理由 |
|------|------|
| `src/` | React 前端，200 个组件 |
| `EngineeringManager.Api/` | C# 项目，你的新后端 |
| `工程管家.bat` | 启动入口 |
| `package.json` / `node_modules/` | 前端还要用 |
| `vite.config.ts` / `tailwind.config.js` / `postcss.config.js` | 前端构建配置 |
| `tsconfig.json` / `tsconfig.node.json` | TypeScript 配置 |
| `config.json` | 数据路径配置 |
| `.claude/` / `.reasonix/` / `.gstack/` | 工具配置 |
| `.git/` / `.gitignore` | 版本控制 |
