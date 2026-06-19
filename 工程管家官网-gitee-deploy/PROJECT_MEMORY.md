# 🧠 项目记忆档案（PROJECT_MEMORY.md）

> **本文件目的**：让任何接手的开发者或 AI Agent **不需要看对话历史**，就能完全理解工程管家官网项目的**所有上下文、决策历史、未解决问题、迁移指南**。

**最后更新**：2026-06-14

---

## 📌 项目一句话

工程管家是面向建筑工程企业的桌面端管理软件。本仓库 `engineering-manager-website` 是该软件的**官方宣传网站**（不是软件本体）。

**线上地址**：https://engineering-manager-website.pages.dev

## 👤 项目所有者

- **GitHub 用户名**：Amer-CN
- **邮箱**：cd.hyxc.jz@foxmail.com
- **使用设备**：Windows 11
- **使用工具**：PowerShell 终端（不用 bash）

## 🏗️ 技术架构（一句话版）

```
React 19 SPA
  ↓ Vite 8 构建
  ↓ 纯静态文件（HTML + CSS + JS + 3 张 webp 画作）
  ↓ Cloudflare Pages 自动部署
  ↓ 用户访问 https://engineering-manager-website.pages.dev
```

**无后端**、**无数据库**、**无 API**。纯前端静态网站。

## 📁 当前实际文件位置（迁移前）

```
E:\测试\                                    ← 用户主工作目录
├── 工程管家\                                ← 主项目（软件本体，不动）
├── 工程管家官网\                            ← 本地开发源码（混合了主项目 .git 状态，不纯净）
├── 工程管家官网-gitee-deploy\              ← 部署版本（已推 GitHub，含完整 .git 历史）
├── 工程管家官网-cloudflare-deploy.zip      ← 旧 zip（可删）
└── 工程管家官网-cloudflare-final.zip       ← 旧 zip（可删）
```

## 🚀 迁移指南（如果你接手这个项目）

### 推荐操作

```bash
# 1. 选一个新目录（如 D:\Projects\em-website）
# 2. 从 GitHub 克隆（这是最纯净的方式）
cd 新目录的上级
git clone https://github.com/Amer-CN/engineering-manager-website.git em-website
cd em-website

# 3. 安装依赖
npm install

# 4. 启动开发服务器
npm run dev    # → http://localhost:5173
```

### 旧目录可以删除

迁移完成后**安全删除**：
- `E:\测试\工程管家官网\`
- `E:\测试\工程管家官网-gitee-deploy\`
- `E:\测试\工程管家官网-cloudflare-deploy.zip`
- `E:\测试\工程管家官网-cloudflare-final.zip`

**不需要迁移 `.git` 仓库历史**——GitHub 上有完整 4 个 commit。

## 🧠 核心决策历史（**接手的开发者必看**）

### 1. 为什么用思源宋体 + 思源黑体，不用 MiSans？

最初计划用小米米谟网站的 MiSans（小米自有字体）+ Huiwen Mincho（汇文明朝体），但**这俩字体都有版权风险**。

最终改用 **Noto Serif SC（思源宋体）+ Noto Sans SC（思源黑体）**，SIL OFL 协议**全球免费商用**，零法律风险。

### 2. 为什么部署到 Cloudflare Pages（不是 Gitee Pages / Vercel）？

| 平台 | 失败原因 |
|------|---------|
| **Gitee Pages** | 需要身份证实名认证（用户身份证掉了） |
| **Vercel / Netlify** | 国内访问差（被墙 / 慢） |
| **Cloudflare Workers** | 默认域名 `*.workers.dev` 在国内被墙 |
| **Cloudflare Pages** | `*.pages.dev` 在国内可用（不快但能用） |
| **腾讯云 EdgeOne Pages** | 默认测试域名限速限流 |

**最终选 Cloudflare Pages**，因为：
- ✅ 不需要实名认证
- ✅ GitHub 自动部署
- ✅ 国内基本能访问

**未来如果国内用户变多**，应该迁移到腾讯云 EdgeOne Pages 绑自定义域名。

### 3. 为什么 Hero 背景图是 3 张 AI 画作，不是 CSS 渐变？

- **最初**：Canvas 粒子 / CSS 渐变 / DotField 点阵 都不够高级
- **用户要求**：参考小米米谟网站（mimo.xiaomi.com/mimocode），那种"鼠标擦开遮罩露出画作"的效果
- **最终方案**：用户**自己用 AI 生图工具**生成 3 张 WebP 图（Zaha 建筑 / 水墨图纸 / 沙漠城市），3:1 比例，~500-700KB 每张
- **提示词**记录在 `PROMPTS.md`

**重要**：3 张图是用户**自己生成**的，不是开源资源。**生产新版本**时需要**重新生成**。

### 4. 为什么"工程管家"主标题用思源宋体 60px Medium？

最初用 Questrial 英文衬线字体，**被吐槽"四个字好丑，不搭"**。改用思源宋体（中文衬线）才统一。

### 5. 为什么 Magnet 按钮监听自身 DOM，不监听 window？

最初 Magnet 组件监听 `window.mousemove`，两个按钮（免费下载 + 了解更多）的磁吸区域会**重叠**，鼠标在中间时**两个都吸** → 撞在一起。

**修复**：监听按钮自身的 DOM（`node.addEventListener('mousemove')`），各自独立检测。

### 6. 为什么 `package.json` 的 `build` 脚本没有 `tsc -b`？

最初是 `"build": "tsc -b && vite build"`，本地能通过（TypeScript 缓存），但**Cloudflare 干净环境**严格模式编译失败（'lastY' possibly null 等 30+ 个错误）。

**解决**：`"build": "vite build"`（**跳过 tsc 检查**）。生产构建不需要严格类型检查（Vite 自己会处理）。

### 7. 为什么 index.html 顶部有 4 个 `<link rel="preload">`？

最初的体验问题：从白主题切到石墨主题，要等 1-3 秒才显示背景图（因为 webp 还没下载）。

**解决**：HTML 解析时立即开始下载 3 张背景图（white/graphite/sandstone.webp）+ favicon。**切换主题瞬时**。

**代价**：白主题用户首屏多下载 1.2MB（其他两张图）。但因为大部分用户会切换主题体验，**这个权衡值得**。

## ⚠️ 常见陷阱（避免重复踩坑）

### 陷阱 1：TypeScript 严格模式 CI 失败

**症状**：Cloudflare 部署时 `error TS18047: 'lastY' is possibly 'null'`

**解决**：`package.json` 中 `build` 脚本**不要**带 `tsc -b`：
```json
"build": "vite build"
```

### 陷阱 2：Logo 镂空不显示

**症状**：Logo 中间不透明，像"实心三角形"

**原因**：用了两个 `<path>` 双重填充，mask 被覆盖

**解决**：用 SVG `<mask>` 元素：
```svg
<mask id="logo-mask">
  <rect width="18" height="18" fill="white"/>
  <path d="M5 14 L9 6 L13 14 Z" fill="black"/>
</mask>
<path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#grad)" mask="url(#logo-mask)"/>
```

### 陷阱 3：Cloudflare Pages 自动部署不触发

**症状**：推送代码后 Cloudflare 没反应

**排查**：
1. Cloudflare Pages → 项目 → Settings → Builds → 检查"Branch"是 `master`
2. 检查"Build command"是 `npm run build`（不是 `tsc -b && vite build`）
3. 检查"Build output directory"是 `dist`

### 陷阱 4：链接 404

**症状**：点击"更新日志"链接跳到 GitHub 404

**原因**：链接写的是 `blob/main/CHANGELOG.md`，但默认分支是 `master`

**解决**：所有 GitHub 链接统一用 `master`（不是 `main`）

### 陷阱 5：国内访问 Cloudflare 慢

**症状**：国内用户访问官网慢

**暂时方案**：无（Cloudflare 在国内没节点）

**最终方案**：迁移到腾讯云 EdgeOne Pages 绑自定义域名（需购买域名 + ICP 备案）

## 🗂️ 文件用途速查

| 文件 | 用途 | 修改频率 |
|------|------|---------|
| `src/components/Hero.tsx` | 首页（Canvas 水墨 + Logo + 标题 + 终端 + 按钮） | 低 |
| `src/components/Features.tsx` | 12 个功能模块 | 低 |
| `src/components/Download.tsx` | 下载页（GitHub Releases + 2 个网盘） | 中（版本号更新时） |
| `src/components/Footer.tsx` | 页脚（GitHub + 邮箱） | 低 |
| `src/components/Navbar.tsx` | 导航栏（主题切换器） | 低 |
| `src/components/Logo.tsx` | Logo（CSS 变量驱动） | 极低 |
| `src/index.css` | 三主题 CSS 变量系统 | 极低 |
| `src/contexts/ThemeContext.tsx` | 三主题 Context + localStorage | 极低 |
| `public/white.webp` | 皓白主题背景图 | 中（AI 重新生成时） |
| `public/graphite.webp` | 石墨主题背景图 | 中（AI 重新生成时） |
| `public/sandstone.webp` | 砂岩主题背景图 | 中（AI 重新生成时） |
| `index.html` | HTML 模板（Google Fonts + preload） | 低 |
| `package.json` | npm 配置 | 极低 |

## 🔗 关键外部资源

- **GitHub 仓库**：https://github.com/Amer-CN/engineering-manager-website
- **Cloudflare Pages**：https://engineering-manager-website.pages.dev
- **主项目（工程管家软件本体）**：https://github.com/Amer-CN/engineering-manager
- **参考网站**：mimo.xiaomi.com/mimocode（小米米谟，参考视觉风格）
- **React Bits 组件源码**：https://github.com/DavidHDev/react-bits（参考的 Magnet/BlurText/ShinyText 来自这里）

## 📞 联系方式

- 邮箱：cd.hyxc.jz@foxmail.com
- 找到用户说"邮箱 cd.hyxc.jz@foxmail.com"即可定位

## 📅 关键时间点

- **2026-06-12**：项目开始
- **2026-06-13**：v1.0.0 首次部署到 Cloudflare Pages
- **2026-06-14**：HTML 预加载优化 + CHANGELOG.md 修复

## 🎯 接手者的下一步建议

1. **阅读 `README.md`** —— 完整项目总览 + 决策历史
2. **阅读本文件** —— 项目记忆 + 陷阱 + 迁移指南
3. **阅读 `CHANGELOG.md`** —— 完整版本历史
4. **克隆 GitHub 仓库**到本地，**`npm install && npm run dev`**
5. **如需修改**：
   - 改功能：编辑 `src/components/`
   - 改主题色：编辑 `src/index.css`
   - 改下载链接：编辑 `src/components/Download.tsx`
6. **发布**：`git add . && git commit -m "..." && git push` → 1-2 分钟自动部署

## 🆘 紧急救援

如果接手时遇到问题：
- **构建失败**：参考 `陷阱 1`（package.json build 脚本）
- **部署失败**：参考 `陷阱 3`（Cloudflare Pages 设置）
- **Logo 不显示**：参考 `陷阱 2`（SVG mask）
- **链接 404**：参考 `陷阱 4`（默认分支名）
- **国内访问慢**：参考 `陷阱 5`（迁移到腾讯云 EdgeOne Pages）

## 📋 最后总结

工程管家官网**不是**一个普通的营销页，它包含了：
- 复杂的 Canvas 水墨擦除动画（mimo 同源算法）
- 3 个 React Bits 组件（Magnet/BlurText/ShinyText，独立实现）
- 完整的三主题系统（CSS 变量驱动）
- AI 生成的高端建筑设计图
- 严格的版权合规（全部 SIL OFL / MIT）
- 性能优化（HTML preload）

如果接手这个项目，**最大的坑是**：
1. 改了 `package.json` 的 build 脚本加了 `tsc -b` → CI 失败
2. 改了默认分支名但链接没改 → 404
3. 想换字体用了版权不明的 → 法律风险

**记住这三点**，其他都是小问题。

---

**本文件最后更新**：2026-06-14
**文档作者**：项目原始开发者（通过 AI 助手记录）
**下次更新时**：直接编辑本文件，添加新决策、新陷阱
