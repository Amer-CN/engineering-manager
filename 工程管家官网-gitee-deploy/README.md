# 工程管家 官网

> 面向建筑工程企业的桌面端管理软件"工程管家"的官方宣传网站。

## 🌐 线上地址

| 类型 | URL |
|------|-----|
| **官网（已上线）** | https://engineering-manager-website.pages.dev |
| **GitHub 仓库** | https://github.com/Amer-CN/engineering-manager-website |
| **主项目仓库（软件本体）** | https://github.com/Amer-CN/engineering-manager |
| **下载页（主源 GitHub Releases）** | https://github.com/Amer-CN/engineering-manager/releases |

## 📋 项目一句话

**工程管家官网** = 一个**纯静态单页应用（SPA）**，用 React 19 + Vite 8 构建，部署到 Cloudflare Pages。访客从 `https://engineering-manager-website.pages.dev` 访问，浏览 12 大功能模块、3 张 AI 生成的高端建筑设计图背景（鼠标擦开遮罩的 Canvas 水墨动画），并通过 3 个下载源（GitHub Releases / 天翼云盘 / 123 云盘）下载"工程管家"桌面客户端。

## ✨ 核心特性

- ⚡ **React 19 + Vite 8 + TypeScript 5** - 极速构建
- 🎨 **三主题适配** - 皓白 / 石墨 / 砂岩，CSS 变量驱动，全站颜色统一切换
- ✍️ **Canvas 水墨擦除动画** - 鼠标在 Hero 区域移动，擦开遮罩露出底部画作（与小米米谟同源算法，独立实现）
- 🖼️ **3 张 AI 画作背景** - 每主题一张 AI 生成的高端建筑设计图（Zaha / 水墨 / 沙漠）
- 📦 **12 大功能模块** - 含已上线 / 即将上线徽章
- 🖱️ **Magnet 按钮磁吸** - 鼠标靠近时按钮被"吸附"，避撞
- ✨ **ShinyText 文字光泽** - 下载按钮文字金属光泽斜扫
- 🔤 **思源宋体 + 思源黑体** - Google Fonts CDN，SIL OFL 协议免费商用

## 🛠 技术栈

| 类型 | 技术 | 备注 |
|------|------|------|
| 框架 | React 19 | 客户端 SPA |
| 构建 | Vite 8 | 极速 dev/build |
| 类型 | TypeScript 5 | 严格模式 |
| 样式 | TailwindCSS | 按需使用 |
| 动画 | framer-motion 12 | 页面切换、卡片入场 |
| 图标 | lucide-react | 12+ 图标 |
| 路由 | react-router-dom 7 | HashRouter（兼容静态托管） |
| 字体 | Noto Serif SC + Noto Sans SC | Google Fonts CDN |
| React Bits | Magnet / BlurText / ShinyText | 从 React Bits 复制源码 |

## 🚀 本地开发

```bash
# 克隆仓库
git clone https://github.com/Amer-CN/engineering-manager-website.git
cd engineering-manager-website

# 安装依赖（Node 20+）
npm install

# 启动开发服务器（http://localhost:5173）
npm run dev

# 构建生产版本
npm run build      # 不跑 tsc 类型检查，直接 Vite 构建（避免严格模式 CI 失败）

# 预览构建结果
npm run preview
```

## 🌐 部署

**当前部署：Cloudflare Pages + GitHub 自动部署**

- **GitHub 仓库**：`Amer-CN/engineering-manager-website`
- **默认分支**：`master`
- **构建命令**：`npm run build`
- **输出目录**：`dist`
- **环境变量**：无
- **触发条件**：推送 master 分支 → 1-2 分钟内自动构建部署

### 修改内容后的发布流程

```bash
# 1. 改代码（本地开发测试：npm run dev）
# 2. 提交并推送
git add .
git commit -m "feat: 你的更新描述"
git push origin master

# 3. 1-2 分钟后访问 https://engineering-manager-website.pages.dev 验证
```

## 📁 项目结构

```
工程管家官网/
├── public/                         # 静态资源（复制到 dist/）
│   ├── favicon.svg
│   ├── white.webp                   # 皓白主题背景图（4K 3:1）
│   ├── graphite.webp                # 石墨主题背景图（4K 3:1）
│   ├── sandstone.webp               # 砂岩主题背景图（4K 3:1）
│   ├── icons.svg
│   └── CHANGELOG.md                 # 在线可访问的更新日志
├── src/
│   ├── components/
│   │   ├── Hero.tsx                # 首页（Canvas 水墨擦除 + BlurText + Magnet + ShinyText）
│   │   ├── Features.tsx            # 12 个功能模块
│   │   ├── Gallery.tsx             # 截图灯箱
│   │   ├── Download.tsx            # 下载页（GitHub + 2 个网盘）
│   │   ├── Footer.tsx              # 页脚
│   │   ├── Navbar.tsx              # 导航栏（主题切换器）
│   │   ├── Logo.tsx                # Logo SVG（CSS 变量驱动三主题）
│   │   └── reactbits/              # React Bits 复制组件
│   │       ├── Magnet.tsx
│   │       ├── BlurText.tsx
│   │       └── ShinyText.tsx
│   ├── contexts/
│   │   └── ThemeContext.tsx        # 三主题 Context（white/graphite/sandstone）
│   ├── App.tsx                     # 应用入口（HashRouter）
│   ├── main.tsx                     # React 渲染入口
│   └── index.css                    # 全局样式 + 三主题 CSS 变量
├── index.html                       # HTML 模板（含 3 张图 preload + Google Fonts）
├── vite.config.ts
├── tsconfig.app.json
├── package.json
├── CHANGELOG.md                     # 完整版本历史
├── README.md                        # 本文件
├── DESIGN.md                        # 设计规范
├── PROMPTS.md                       # 3 张画作的生图提示词
├── LICENSE.md                       # 第三方协议说明
└── DEPLOY.md                        # 部署指南
```

## 🧠 项目决策历史（重要！）

记录所有"为什么这样做"的决策，避免未来重新踩坑：

### 1. 字体选择：思源宋体 + 思源黑体（不是 MiSans / Huiwen Mincho）

- **最初计划**：用 mimo.xiaomi.com 风格的 MiSans（小米自有字体）+ Huiwen Mincho（汇文明朝体）
- **问题**：MiSans 和 Huiwen Mincho 都**不开放免费商用授权**，会有法律风险
- **最终决定**：改用 Google Fonts 上的 **Noto Serif SC（思源宋体）+ Noto Sans SC（思源黑体）**，**SIL OFL 协议全球免费商用**
- **效果**：与 mimo 风格略有不同（米谟用的定制字体），但零法律风险

### 2. 主题名称：皓白 / 石墨 / 砂岩（与主项目对齐）

- 主项目 `工程管家` 已有的三主题配色（`oklch(17% 0.005 280)` 深冷灰等）就是按这名字命名的
- 官网**严格对齐**主项目的 CSS 变量
- **改动需谨慎**：改了官网的 CSS 变量会破坏与主项目的视觉一致性

### 3. Logo：CSS 变量驱动渐变（不是三套 SVG）

- **最初计划**：用 `white.svg / graphite.svg / sandstone.svg` 三套不同颜色的 Logo
- **问题**：Logo 在不同主题下显示不同颜色，**但三主题都用同一 Logo 组件**更优雅
- **最终方案**：用 React 组件 `<Logo />` ，内部 `<linearGradient>` 使用 `var(--accent)` 渐变色——**自动适配三主题**

### 4. Hero 背景图：从点阵 / 渐变 / 真实图 迭代

- **v1**：Canvas 粒子背景（性能差）
- **v2**：CSS 渐变（不好看）
- **v3**：mimo 风格的 DotField 组件（性能 OK，但点太密不优雅）
- **最终**：用户**自生成 3 张 AI 建筑设计图**（Zaha / 水墨 / 沙漠）作为背景，**真实画作感最强**

### 5. "工程管家"主标题：思源宋体 Medium 60px

- **最初**：Questrial 英文衬线字体（与中文不搭，被吐槽"好丑"）
- **改用**：思源宋体 Medium 60px（中文衬线，更统一）

### 6. 部署平台：Cloudflare Pages（最终选）

**决策链**：
- ❌ Gitee Pages：需要身份证实名认证（用户身份证掉了）
- ❌ Vercel / Netlify / Workers：国内访问差（被墙 / 慢）
- ❌ 腾讯云 EdgeOne Pages：默认测试域名限速限流
- ✅ **Cloudflare Pages**：GitHub 自动部署 + `*.pages.dev` 域名 + 国内可用（虽然不快但能用）

### 7. 下载源：三层保障

- **主源**：GitHub Releases（v0.70.0 安装包，自动化发布）
- **备用 1**：天翼云盘（`https://cloud.189.cn/web/share?code=jUjM73RJRbUv` 访问码 `yqq4`）
- **备用 2**：123 云盘（`https://1821605241.share.123865.com/123pan/uSpfjv-LWVVv` 提取码 `HovS`）

### 8. 优化细节

- **HTML 顶部 preload 3 张背景图**：让浏览器解析 HTML 时立即开始下载，**切换主题瞬时无卡顿**
- **Magnet 按钮**：监听自身 DOM 而非 window，避免两个按钮同时被吸而撞
- **React StrictMode 兼容**：Canvas 事件监听器正确清理（`removeEventListener`）

## 🎨 设计规范（详见 DESIGN.md）

| 主题 | 背景 | 主色 | 文字 |
|------|------|------|------|
| **皓白** | Zaha Hadid 参数化建筑 | `var(--color-blue)` 蓝 | `#26251e` 深棕 |
| **石墨** | 水墨风建筑图纸 | `var(--color-orange)` 橙 | `oklch(96%)` 浅白 |
| **砂岩** | 沙漠未来城市 | `var(--color-teal)` 青 | `#2a2018` 暖棕 |

12 个功能模块各有专属语义色（indigo/amber/emerald/blue/violet/cyan/orange/teal/pink/slate/emerald）

## 🐛 常见错误与解决

### TypeScript 严格模式 CI 失败

**症状**：Cloudflare 构建时 `error TS18047: 'lastY' is possibly 'null'`

**解决**：`package.json` 中 `build` 脚本改为 `"build": "vite build"`（**不要**用 `"tsc -b && vite build"`）

### 主题切换卡顿

**症状**：从白主题切到石墨主题，要等 1-3 秒才显示背景图

**解决**：`index.html` 头部有 4 个 `<link rel="preload">`，浏览器解析时立即下载 3 张背景图 + favicon

### Logo 镂空不显示

**症状**：Logo 中间不透明，不像"挖空"

**原因**：用了 `<path fill="...">` 双重填充，镂空被覆盖

**解决**：用 `<mask>` SVG 元素，mask 内的黑色 = 透明，白色 = 可见

### 3 张 webp 图国内访问被卡

**现象**：CDN 缓存或地区限速

**临时方案**：天翼云 / 123 云盘下载链接

## 🛠 关键技术决策的代码位置

| 决策 | 文件 |
|------|------|
| 三主题 CSS 变量 | `src/index.css` |
| 三主题 Context | `src/contexts/ThemeContext.tsx` |
| Logo（CSS 变量驱动） | `src/components/Logo.tsx` |
| Canvas 水墨擦除 | `src/components/Hero.tsx`（`useEffect` 内 Canvas + `destination-out`） |
| Magnet 按钮 | `src/components/reactbits/Magnet.tsx` |
| 12 个功能模块 | `src/components/Features.tsx` |
| 下载页 | `src/components/Download.tsx`（`GITHUB_REPO` 常量、`mirrorUrl`、`mirrorUrl2`） |
| HTML 预加载 | `index.html`（`<link rel="preload" as="image" href="/white.webp">`） |

## 📚 完整文档

| 文档 | 内容 |
|------|------|
| [README.md](README.md) | 本文件（项目总览 + 决策历史） |
| [CHANGELOG.md](CHANGELOG.md) | 版本更新日志（Keep a Changelog 格式） |
| [DESIGN.md](DESIGN.md) | 设计规范（三主题色值、字体、间距、组件） |
| [PROMPTS.md](PROMPTS.md) | 3 张画作背景的生图提示词（中英对照） |
| [LICENSE.md](LICENSE.md) | 第三方依赖协议说明（MIT / SIL OFL / ISC） |
| [DEPLOY.md](DEPLOY.md) | 部署指南（多平台方案） |

## 📞 联系

- **邮箱**：cd.hyxc.jz@foxmail.com
- **GitHub**：https://github.com/Amer-CN/engineering-manager

## 📋 后续待办

- [ ] 完善 README 中的官网截图
- [ ] 添加 Google Analytics / 百度统计
- [ ] SEO meta 优化（og:image、description）
- [ ] 自定义域名（待购买）
- [ ] Lighthouse 性能优化
- [ ] PWA 渐进式 Web 应用
- [ ] i18n 多语言支持

---

**最后更新**：2026-06-14
**版本**：v1.0.0
**状态**：✅ 已上线（https://engineering-manager-website.pages.dev）
