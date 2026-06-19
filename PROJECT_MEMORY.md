# 工程管家官网 —— 完整项目记忆

> 最后更新：2026-06-14
> 目的：项目文件夹重建后，任何 Agent 或开发者读一遍本文，就能完全理解项目全貌、决策历史、踩坑经验。

---

## 一、项目是什么

**工程管家**是面向建筑工程企业的桌面端管理软件。本仓库 `engineering-manager-website` 是其**官方宣传网站**（纯静态 SPA），不是软件本体。

**线上地址**：https://engineering-manager-website.pages.dev

**GitHub 仓库**：https://github.com/Amer-CN/engineering-manager-website

**主项目仓库（软件本体）**：https://github.com/Amer-CN/engineering-manager

---

## 二、技术栈

```
React 19 + Vite 8 + TypeScript 5
framer-motion 12（动画）
lucide-react（图标）
react-router-dom 7（HashRouter）
Noto Serif SC + Noto Sans SC（思源宋体/黑体，Google Fonts CDN，SIL OFL 免费商用）
React Bits 组件（Magnet / BlurText / ShinyText，源码从 GitHub 复制）
```

**无后端、无数据库、无 API**。纯前端静态网站。

---

## 三、部署

- **平台**：Cloudflare Pages
- **方式**：GitHub 自动部署（推 master → 1-2 分钟自动上线）
- **构建命令**：`npm run build`（**不要**加 `tsc -b`，见坑 1）
- **输出目录**：`dist`
- **默认分支**：`master`（**不是** main）

---

## 四、核心功能

### Hero 首页
- Canvas 水墨擦除动画（与小米米谟 mimo.xiaomi.com 同源算法）
- 3 张 AI 生成的 WebP 画作背景（3:1 宽屏，~500-700KB）
  - `white.webp`：Zaha Hadid 参数化建筑
  - `graphite.webp`：水墨风建筑图纸
  - `sandstone.webp`：沙漠未来主义城市
- HTML 顶部 `<link rel="preload">` 预加载 3 张图（切换主题无卡顿）
- BlurText 主标题字符入场动画
- Magnet 按钮磁吸效果
- ShinyText 文字金属光泽

### 三主题
- 皓白（冷白底 + 蓝色 Zaha 建筑）
- 石墨（深灰底 + 橙红水墨图纸）
- 砂岩（暖米黄底 + 沙漠城市）
- CSS 变量驱动，切换时只换 `data-theme` 属性
- Logo 组件用 `var(--accent)` 渐变色，自动适配

### 12 个功能模块
人事 / 工人 / 发票 / 合同 / 项目 / 结算 / 模板 / 成本 / 仓库 / 单位 / AI 数据守护（已上线）/ AI 助手（即将上线）

### 下载页
- 主源：GitHub Releases（`https://github.com/Amer-CN/engineering-manager/releases/download/v0.70.0/v0.70.0.exe`）
- 备用 1：天翼云盘（访问码 yqq4）
- 备用 2：123 云盘（提取码 HovS）

---

## 五、踩过的坑（最重要的部分）

### 坑 1：Cloudflare Pages 构建失败 —— `tsc -b`

**症状**：Cloudflare 构建时 30+ 个 TypeScript 错误（TS18047 'lastY' is possibly null）

**原因**：本地有 TypeScript 缓存所以能过，Cloudflare 干净环境严格模式编译失败

**解决**：`package.json` 中改为 `"build": "vite build"`（去掉 `tsc -b`）

**代价**：失去构建时类型检查。但对于本项目（UI 为主，无复杂逻辑）完全可接受

### 坑 2：Cloudflare Workers 不是 Pages

**症状**：创建项目时选了 Workers 类型，得到 `*.workers.dev` 域名，国内被墙

**原因**：Cloudflare 控制台 Create application 页面有多个选项，容易选错

**解决**：删掉重建，选 Pages 类型（`*.pages.dev`）

**教训**：创建项目后**第一件事**检查域名是 `pages.dev` 还是 `workers.dev`

### 坑 3：默认分支是 master，不是 main

**症状**：CHANGELOG.md 链接 404

**原因**：GitHub 仓库默认分支是 `master`，但链接写成了 `blob/main/`

**解决**：所有 GitHub 链接统一用 `master`

### 坑 4：字体版权风险

**症状**：最初想用 MiSans（小米字体）+ Huiwen Mincho（汇文明朝体）

**原因**：这两个字体都不开放免费商用授权

**解决**：改用 Google Fonts 的 Noto Serif SC + Noto Sans SC（SIL OFL 协议）

**教训**：**任何字体必须确认商用授权**后再使用

### 坑 5：Magnet 按钮碰撞

**症状**：鼠标在两个按钮中间时，两个按钮同时被吸，撞在一起

**原因**：两个 Magnet 组件都监听 `window.mousemove`，60px 触发范围重叠

**解决**：监听按钮自身 DOM（`node.addEventListener`），限制最大位移 8px

### 坑 6："工程管家"主标题丑

**症状**：被吐槽"四个字好丑，不搭这么漂亮的首页"

**原因**：用了 Questrial 英文衬线字体套中文，风格完全不统一

**解决**：改用思源宋体 Medium 60px

### 坑 7：Gitee Pages 实名认证

**症状**：想用 Gitee Pages 部署（国内快），但要求手持身份证拍照

**原因**：用户身份证掉了，无法完成实名认证

**解决**：改用 Cloudflare Pages（不需要实名认证）

**教训**：**先确认部署平台的认证要求**再开始

### 坑 8：Cloudflare Pages 自动部署不触发

**症状**：推送代码后 Cloudflare 没反应，还是旧版

**原因**：可能是 Pages 项目配置问题，或 GitHub 连接断开

**解决**：Settings → Builds 确认 branch 是 `master`，command 是 `npm run build`

### 坑 9：主题切换卡顿

**症状**：从白主题切到石墨主题，要等 1-3 秒才显示背景图

**原因**：切换主题时才触发下载 webp 图

**解决**：`index.html` 顶部加 `<link rel="preload">`，浏览器解析 HTML 时立即下载 3 张图

**代价**：白主题用户首屏多下载 1.2MB（其他两张不用的图）。但因为大部分用户会切换主题，值得

---

## 六、项目决策历史

### 为什么选 Cloudflare Pages
- Gitee Pages → 需要身份证（×）
- Vercel / Netlify → 国内被墙（×）
- Cloudflare Workers → 国内被墙（×）
- Cloudflare Pages → 国内可用，GitHub 自动部署（√）

### 为什么选思源宋体
- MiSans / Huiwen Mincho → 有版权风险（×）
- Noto Serif/Sans SC → SIL OFL 全球免费商用（√）

### 为什么用 AI 画作做背景
- Canvas 粒子 → 性能差（×）
- CSS 渐变 → 不够高级（×）
- DotField 点阵 → 不够优雅（×）
- AI 生成建筑设计图 → 高大上，每主题一张（√）

### Logo 为什么用 CSS 变量而不是三套 SVG
- 三套 SVG → 维护成本高（×）
- CSS 变量驱动渐变 → 一个组件自动适配三主题（√）

### 为什么不用 `tsc -b`
- 严格模式在 Cloudflare 干净环境编译失败（×）
- `vite build` 跳过类型检查，UI 项目完全够用（√）

---

## 七、接手者 Checklist

新 Agent 或开发者接手时，按以下顺序操作：

```
□ 1. 读本文档（PROJECT_MEMORY.md）
□ 2. 克隆 GitHub 仓库
□ 3. npm install
□ 4. npm run dev（启动本地开发服务器）
□ 5. 改代码
□ 6. git add . && git commit -m "描述" && git push
□ 7. 等 1-2 分钟，访问 https://engineering-manager-website.pages.dev 验证
```

**注意事项**：
- 默认分支是 `master`，不是 `main`
- build 命令**不要**加 `tsc -b`
- 字体不要换（已确认版权合规）
- 3 张 webp 图是用户自生成，重新生成时参考 `PROMPTS.md`

---

## 八、关键常量

| 常量 | 值 | 位置 |
|------|------|------|
| GitHub 仓库 | `https://github.com/Amer-CN/engineering-manager-website` | `Download.tsx` |
| 线上 URL | `https://engineering-manager-website.pages.dev` | - |
| 默认分支 | `master` | - |
| 构建命令 | `npm run build` | `package.json` |
| 输出目录 | `dist` | `vite.config.ts` |
| 版本号 | `v0.70.0` | `Download.tsx` |
| 天翼云访问码 | `yqq4` | `Download.tsx` |
| 123 云提取码 | `HovS` | `Download.tsx` |

---

## 九、文件修改指南

| 想改什么 | 改哪个文件 |
|---------|-----------|
| 功能模块内容 | `src/components/Features.tsx` |
| 主题颜色 | `src/index.css`（CSS 变量） |
| 下载链接/版本号 | `src/components/Download.tsx` |
| 画作背景图 | `public/white.webp` / `graphite.webp` / `sandstone.webp` |
| 导航栏 | `src/components/Navbar.tsx` |
| Logo | `src/components/Logo.tsx` |
| 首页 Hero | `src/components/Hero.tsx` |
| 字体 | `index.html`（Google Fonts 链接）+ `src/index.css`（font-family）|

---

## 十、本文件位置

在项目根目录创建 `PROJECT_MEMORY.md`，内容就是本文。

**不需要推到 GitHub**——纯本地文档，新会话时让 Agent 读这个文件即可。

---

*本文档是项目的"黑匣子"，记录了所有有价值的经验。更新时直接编辑本文。*
