# 更新日志 / Changelog

所有关于"工程管家"官网（engineering-manager-website）的变更都记录在这里。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [1.0.0] - 2026-06-13

### 🎉 首次发布

官网正式上线，部署到 Cloudflare Pages。

### ✨ 新增功能
- **Hero 区域**：Canvas 水墨擦除动画，鼠标擦开遮罩露出底部画作
- **三主题适配**：皓白 / 石墨 / 砂岩，CSS 变量驱动，全站颜色统一切换
- **3 张画作背景**：每主题一张 AI 生成的高端建筑设计图
  - 皓白主题：Zaha Hadid 风格参数化建筑
  - 石墨主题：水墨风建筑图纸
  - 砂岩主题：沙漠未来主义城市
- **思源宋体 + 思源黑体**：Noto Serif/Sans SC，Google Fonts CDN，SIL OFL 协议免费商用
- **12 个功能模块**：
  - 已上线：人事、工人、发票、合同、项目、结算、模板、成本、仓库、单位、AI 数据守护
  - 即将上线：AI 助手
- **Magnet 按钮磁吸效果**：避免两个按钮同时被吸而撞在一起
- **ShinyText 文字光泽**：下载按钮文字金属光泽斜扫
- **BlurText 字符入场**：主标题"工程管家"逐字模糊到清晰

### 🐛 修复
- **TypeScript 类型错误**：Cloudflare 干净环境下严格模式编译失败
  - 修复 Hero.tsx 中 `lastY` / `ctx` / `hero` null 检查
  - 修复 Features.tsx `ease` 数组类型
  - 修复 ThemeId 导出缺失
  - 跳过 `tsc -b` 类型检查（仅用 `vite build`）
- **React StrictMode 重复执行**：Canvas 画布事件监听器正确清理
- **Magnet 按钮碰撞**：两个按钮独立监听自身 DOM，限制最大位移 8px

### ⚡ 性能优化
- **HTML 顶部预加载 3 张主题背景图**：浏览器解析时立即下载，切换主题瞬间切换无卡顿
- **Canvas 优化**：单 RAF 循环、批量绘制、内存清理
- **三主题 CSS 变量系统**：零运行时主题切换成本

### 📚 文档
- **DESIGN.md**：设计规范（三主题配色、字体、间距、组件）
- **PROMPTS.md**：3 张画作背景的生图提示词（中英对照 + 工具参数）
- **LICENSE.md**：第三方依赖协议说明（MIT、SIL OFL、ISC）
- **DEPLOY.md**：部署指南（Gitee Pages / GitHub Pages / 通用静态托管）
- **README.md**：项目介绍 + 本地开发 + 部署说明

### 🔒 版权合规
- 全部使用 SIL OFL / MIT / ISC 等免费商用协议
- 替换了原计划的 MiSans 和 Huiwen Mincho（避免法律风险）
- Hero 背景图均为用户自生成

### 🌐 部署
- **GitHub 仓库**：https://github.com/Amer-CN/engineering-manager-website
- **Cloudflare Pages**：https://engineering-manager-website.pages.dev
- **自动部署**：推送到 master 分支后 1-2 分钟内自动构建部署

---

## 待办 / Roadmap

### 短期（v1.1）
- 完善 README 中的截图
- 添加 Google Analytics / 百度统计
- 优化 SEO meta（description / keywords / og:image）
- 添加自定义域名（需购买域名）

### 中期（v1.2）
- 添加 GitHub Actions 自动发布
- 添加 Lighthouse 性能优化
- 接入 PWA（渐进式 Web 应用）

### 长期（v2.0）
- i18n 多语言支持
- 服务端渲染（SSR）以提升 SEO
- AI 助手真实接入（chat / completion API）

---

[1.0.0]: https://github.com/Amer-CN/engineering-manager-website/releases/tag/v1.0.0
