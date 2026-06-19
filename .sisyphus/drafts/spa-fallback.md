# SPA Fallback - 进度记录

## 当前状态：准备执行

## 已完成
- [x] 全面研究项目架构（C# API + React 前端 + WebView2 窗口）
- [x] 识别所有相关文件和代码路径
- [x] 编写详细计划：.sisyphus/plans/spa-fallback.md
- [x] 用户确认方案

## 执行中
- [ ] Task 1: 修改 Program.cs — 静态文件托管 + SPA 回退
- [ ] Task 2: 修改 EntryPoint.cs — 生产模式 + 跳过 Vite
- [ ] Task 3: 编译验证 + 开发模式回归测试
- [ ] Task 4: 生产模式集成测试（QA）

## 关键决策
1. **静态文件服务**：C# Kestrel 托管 dist/ 目录（UseStaticFiles + SPA 回退）
2. **模式切换**：通过 dist/ 目录存在性自动判断生产/开发模式
3. **前端零修改**：api-client.ts 已使用 localhost:5048，ocr.ts 使用相对路径
4. **OCR 配置**：vite build 自动复制到 dist/，静态文件服务直接提供
5. **API 就绪检测**：轮询 /api/health 而非硬编码 Sleep

## 文件变更计划
| 文件 | 变更内容 |
|------|---------|
| EngineeringManager.Api/Program.cs | ConfigureApp 添加静态文件 + SPA 回退 + 健康检查端点 |
| EngineeringManager.Api/EntryPoint.cs | 生产模式检测、跳过 Vite、等待 API 就绪 |
| EngineeringManager.Api/MainWindow.cs | Navigate URL 根据模式切换 5173/5048 |

## 开发模式保留（不动）
- Vite 启动逻辑
- 硬编码 Sleep(5000)
- localhost:5173 导航
- CORS 配置
- 数据库逻辑
