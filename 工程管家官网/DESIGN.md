# 工程管家官网 — DESIGN.md

## 产品定位

**工程管家**是一款面向建筑工程企业的桌面管理软件，集人事、合同、发票、项目、仓库、成本核算于一体。

- **目标用户**：建筑公司管理人员、项目经理、财务人员、工地负责人
- **品牌调性**：专业、可靠、高效、沉稳
- **竞品参考**：小米米谟（水墨擦除动画、极简排版、高质量留白）

## 设计系统

### 颜色（三主题）

颜色全部使用 CSS 变量，与主项目 `src/index.css` 完全对齐。

#### White（皓白）— 明亮 · 蓝
```
背景主色:    #fcfaf8  (暖白)
背景二级:    #f1f5f9  (slate-100)
卡片:        rgba(255,255,255,0.8)
文字主色:    #0f172a  (slate-900)
文字二级:    #475569  (slate-600)
弱化文字:    #94a3b8  (slate-400)
边框:        rgba(148,163,184,0.25)
Primary:     #3b82f6  (blue-500)
Accent:      #6366f1  (indigo-500)
```

#### Graphite（石墨）— 深色 · 橙
```
背景主色:    oklch(17% 0.005 280)
背景二级:    oklch(20% 0.006 275)
卡片:        oklch(23.5% 0.007 275 / 0.85)
文字主色:    oklch(96% 0.004 280)
文字二级:    oklch(81% 0.005 280)
Accent:      oklch(68% 0.16 38)   ← 橙色
```

#### Sandstone（砂岩）— 暖浅 · 琥珀
```
背景主色:    oklch(97.5% 0.008 80)
背景二级:    oklch(95.5% 0.011 78)
卡片:        oklch(99.5% 0.003 80 / 0.85)
文字主色:    oklch(22% 0.014 55)
Accent:      oklch(60% 0.19 38)   ← 琥珀橙
```

### 排版

```
Display:     Questrial / 'Century Gothic' / 'Avenir Next'  (标题)
标题正文:    'PingFang SC' / 'Microsoft YaHei' / 'Noto Serif SC'  (衬线)
正文:        'PingFang SC' / 'Microsoft YaHei' / sans-serif

字号层级:
  Hero 标题:    clamp(48px, 12vw, 120px)
  Section 标题:  clamp(28px, 5vw, 42px)
  卡片标题:      22px
  正文:          16px
  小字:          14px
  辅助:          13px
```

### 间距

```
基础单位:    4px
间距比例:    4, 8, 12, 16, 20, 24, 32, 40, 48, 60, 80, 100
Section 内边距:  100px (桌面) / 60px (移动端)
卡片内边距:      32px
容器最大宽度:    1200px
```

### 圆角

```
小:    8px
中:    12px
大:    20px
按钮:  46px (胶囊形)
```

### Logo

使用安装程序的 SVG 组件（CSS 变量驱动渐变 + mask 镂空），自动适配三主题：
```tsx
<linearGradient>
  <stop offset="0%" stopColor="var(--accent)" />
  <stop offset="100%" stopColor="var(--accent-strong)" />
</linearGradient>
```

## 页面结构

### Hero 区域
- **效果**：Canvas 水墨擦除遮罩（与小米米谟同源算法）
- **层级**：Layer 0 装饰背景 → Layer 1 Canvas 遮罩 → Layer 2 内容
- **内容**：Logo + 标题 + 副标题（逐字打印）+ 安装命令 + CTA 按钮
- **鼠标交互**：擦除遮罩露出背景渐变，墨点有不规则水墨边缘

### 功能特性
- 10 个功能模块卡片网格（auto-fill, minmax 320px, 1fr）
- 玻璃拟态卡片，hover 上浮 + 边框高亮
- framer-motion staggerChildren 逐项入场
- 图标使用 lucide-react

### 截图展示
- 6 个截图卡片 + 灯箱轮播
- 点击放大查看，左右切换

### 下载页面
- 版本号 + 安装包下载 + 系统要求表格
- 安全提示

### 页脚
- Logo + 品牌描述 + 快速链接 + 联系方式

## 动画规范

```
入场动画:    framer-motion spring (stiffness ≤ 200)
页面切换:    opacity 纯透明度
悬停效果:    transform + box-shadow, 200-300ms ease
滚动触发:    whileInView + viewport once
```

## 响应式断点

```
桌面:    > 768px
平板:    768px
手机:    < 768px
```
