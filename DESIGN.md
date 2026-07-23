---
name: 工程管家 · Bedrock
description: 工程行业的精密仪器 —— 保留成熟 AI 骨架，重铸设计的皮与魂
colors:
  bg: "oklch(16% 0.012 250)"
  panel: "oklch(21% 0.015 250)"
  card: "oklch(22.5% 0.016 250)"
  hairline: "oklch(32% 0.02 250 / 0.7)"
  content: "oklch(97% 0.008 240)"
  content-2: "oklch(80% 0.012 240)"
  content-muted: "oklch(64% 0.016 245)"
  accent: "oklch(74% 0.15 220)"
  accent-2: "oklch(82% 0.14 195)"
  on-accent: "oklch(18% 0.03 250)"
  state-ok: "oklch(76% 0.15 165)"
  state-warn: "oklch(80% 0.14 85)"
  state-danger: "oklch(70% 0.19 25)"
typography:
  display:
    fontFamily: "Inter, 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "27px"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  heading:
    fontFamily: "Inter, 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, 'Noto Sans SC', system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    letterSpacing: "0.12em"
  numeric:
    fontFamily: "'JetBrains Mono', 'Geist Mono', ui-monospace, Consolas, monospace"
    fontSize: "28px"
    fontWeight: 700
    letterSpacing: "-0.03em"
    fontFeature: "'tnum' 1"
rounded:
  sm: "9px"
  md: "10px"
  lg: "16px"
  xl: "22px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "26px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.sm}"
    padding: "0 15px"
    height: "34px"
  button-ghost:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.content-2}"
    rounded: "{rounded.sm}"
    padding: "0 15px"
    height: "34px"
  kpi-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.content}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
  nav-item-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.content}"
    rounded: "{rounded.sm}"
    padding: "8px 10px"
  input-field:
    backgroundColor: "{colors.card}"
    textColor: "{colors.content}"
    rounded: "{rounded.xl}"
    padding: "6px 6px 6px 18px"
---

# Design System: 工程管家 · Bedrock

## 1. Overview

**Creative North Star: "精密仪器 / The Precision Instrument"**

Bedrock 把工程管家当成一台**专业驾驶舱级的精密仪器**来对待，而不是又一个后台管理模板。它的气质来自机械腕表和工程蓝图：冷静、笃定、每一个数字都对得整整齐齐，边界是发丝级的细线而不是笨重的粗框，深度靠一层层表面和柔和环境光营造，而不是靠廉价的重投影。它是一位沉稳的行业专家管家的视觉化身。

这套系统显式拒绝：泛蓝企业 SaaS 模板、深灰渐变的 hero-metric 横幅、千篇一律的图标卡片墙、"深蓝紫霓虹 / 满屏玻璃拟态"的一眼假 AI 外观，以及任何不传达状态的装饰动画。density（信息密度）为工程数据服务，但密而不乱；delight（惊喜）只集中在外壳、AI 主页、驾驶舱和入场等高光时刻。

三套主题不是"换个色"，而是同一台仪器在三种光线环境下的呈现，各自都有明确的使用场景（见 Colors）。

**Key Characteristics:**
- 单一 OKLCH 语义 token 体系，零硬编码颜色，主题只换变量不改结构。
- 发丝级边界 + 分层表面 + 柔和环境光，几乎不用硬投影。
- 金额与 KPI 强制等宽 tabular 数字，读起来像仪表读数。
- accent 稀有：只出现在主操作、当前选中、状态与 AI 触点。
- 玻璃质感只用于浮层（命令面板、弹层），绝不铺满内容区。

## 2. Colors

调色板是"深空里的电光信号"：大面积低彩度中性面，靠一个克制而精准的信号色点亮，三套主题各换一种信号色与明暗基调。frontmatter 中的 canonical 值取自旗舰主题 Blueprint。

### Primary
- **Electric Cyan-Blue / 电光青蓝** (`oklch(74% 0.15 220)`)：Blueprint（暗色旗舰）主题的信号色。用于主按钮、当前选中态、状态高亮、AI 触点、焦点环与发光。是全屏里唯一"会发光"的颜色。
- **Aqua Highlight / 浅青高光** (`oklch(82% 0.14 195)`)：accent 的更亮变体，仅用于渐变高光端、能量球高光、图标微光，制造光泽而非大面积铺色。

### Secondary
三套主题各自的信号色（同为 Primary 角色，随主题切换）：
- **Titanium（亮）Ink-Blue** (`oklch(58% 0.17 250)`)：中性冷灰亮底上的单一电光蓝信号色，配近白文字。
- **Kiln（暖暗）Molten Copper** (`oklch(74% 0.16 55)`)：暖石墨底上的熔铜琥珀信号色，延续行业"安全帽 / 施工"暖调。

### Neutral
- **Deep Space / 深空底** (`oklch(16% 0.012 250)`，Blueprint)：应用背景，向品牌蓝染极低彩度，绝非纯黑。
- **Panel / 面板** (`oklch(21% 0.015 250)`) 与 **Card / 卡面** (`oklch(22.5% 0.016 250)`)：两层抬升表面，用亮度差而非投影拉开层级。
- **Hairline / 发丝线** (`oklch(32% 0.02 250 / 0.7)`)：所有分隔与卡片边界，1px。
- **Content / 正文** (`oklch(97% 0.008 240)`)、**Content-2 / 次级** (`oklch(80% 0.012 240)`)、**Muted / 弱化** (`oklch(64% 0.016 245)`)：三级文字层级，均染微量蓝相，无纯白。

### Named Rules
**The Single Token Rule.** 所有颜色必须走语义 token（surface / content / border / accent / state-*）。禁止在组件里硬编码 `bg-white`、`slate-*`、hex 值。换主题只改 `:root` 变量，绝不再写 `[data-theme] .bg-slate-100 {}` 这类覆盖补丁。

**The One Signal Rule.** accent（信号色）只允许出现在四种地方：主操作、当前选中 / 焦点、状态指示、AI 触点。它在任意一屏的占比应 ≤ 10%，稀有正是它的意义。禁止把 accent 当装饰底色大面积铺开。

## 3. Typography

**Display / Body Font:** Inter（西文）+ Noto Sans SC（中文），system-ui 兜底。
**Numeric Font:** JetBrains Mono / Geist Mono（等宽，tabular figures）。

**Character:** 一套精心调校的无衬线承担全部界面文字（标题 / 正文 / 标签），克制、专业、无个性噪音；数字则交给等宽字体，让金额和 KPI 像仪表读数一样对齐。产品界面不需要展示性衬线或花体。

### Hierarchy
- **Display**（750，27px，line-height 1.1，-0.02em）：AI 主页问候、页面主标题。
- **Heading**（650，16px，1.3）：卡片标题、区块标题。
- **Body**（400，14px，1.6）：正文、说明、对话气泡；长文本行宽控制在 65–75ch。
- **Label**（700，11px，letter-spacing 0.12em，大写 / 全角）：导航分组、KPI 标签、表头。
- **Numeric**（700，等宽，tabular，-0.03em）：金额、KPI 数值、百分比、计数、状态栏读数。

### Named Rules
**The Tabular Numeral Rule.** 一切金额、KPI、百分比、计数一律使用等宽字体并开启 `font-feature-settings: 'tnum' 1`。数字必须能上下对齐成"仪表读数"。禁止用比例字体渲染金额（会导致小数点跳动、显廉价）。

**The Flat Scale Ban.** 层级靠 scale + weight 对比（相邻级 ≥ 1.25 或明显字重差）拉开，禁止用一堆同号字堆出"扁平无层级"的界面。

## 4. Elevation

系统以**分层表面（tonal layering）为主、柔和环境光为辅**表达深度，几乎不用硬投影。层级顺序：`bg → panel → card`，靠 OKLCH 亮度递增来区分；只有真正浮起的元素（浮层、hover 抬起）才使用带品牌色相的、极其柔和的大扩散阴影。

### Shadow Vocabulary
- **Ambient Glow / 环境光**（`box-shadow: 0 12px 40px -8px var(--glow)`）：能量球、主按钮等"发光体"下方的漫射辉光，传达"活着 / 智能"，非结构投影。
- **Floating / 浮层**（`box-shadow: 0 20px 60px -24px oklch(0% 0 0 / 0.7)`）：命令面板、下拉、弹层等脱离平面的浮层。
- **Lift / 抬起**（`box-shadow: 0 4px 16px -8px …`）：卡片 hover 时的轻微抬起反馈。

### Named Rules
**The Flat-By-Default Rule.** 内容表面在静止态是平的，靠亮度分层和发丝边界区分层级。阴影只作为状态响应（hover、浮起、聚焦）出现，绝不给静止卡片挂重投影。

**The Glass-Only-Floats Rule.** backdrop-filter 毛玻璃只允许用于**浮层**（命令面板、弹出菜单、toast）。禁止给标题栏、输入框、卡片等常驻内容元素默认加玻璃 —— 那正是"一眼假 AI"的元凶。

## 5. Components

### Buttons
- **Shape:** 圆角矩形（9px），高 34px。
- **Primary:** 实心 accent 底 + `on-accent` 文字（每主题一份的语义 token，绝不写死颜色），带极柔和的 accent 辉光；hover 时轻微提亮并上浮 1px。
- **Ghost / Secondary:** panel 底 + 发丝边 + content-2 文字；hover 提一层表面。
- **状态:** default / hover / focus-visible（accent 焦点环）/ active / disabled 五态齐全。

### Chips
- **Style:** panel 底 + 发丝边 + content-2 文字，圆角胶囊，左侧可带 accent 图标。
- **State:** hover 时边框转 accent-line、文字转 content、上浮 1px；用于 AI 快捷提问、筛选。

### Cards / Containers
- **Corner Style:** 16px（lg）。
- **Background:** card 表面；KPI 主卡可用 accent-soft 微渐变以建立层级。
- **Shadow Strategy:** 见 Elevation —— 静止平面，hover 才 Lift。
- **Border:** 1px 发丝线；hover 转 accent-line。
- **禁止嵌套卡片**（卡中卡永远是错的），也禁止把整页都塞进一个容器。

### Inputs / Fields
- **Style:** card 实色底 + 发丝边，圆角随场景（对话输入用 22px 大圆角胶囊）。
- **Focus:** 边框转 accent + 4px accent-soft 辉光环，不做位移。
- **禁止**给输入框默认加毛玻璃。

### Navigation（侧边栏 · 指挥中心）
- **Style:** 圆角药丸导航项；分组用 Label 字样（大写 + 宽字距）。
- **States:** default（content-2）/ hover（提一层表面）/ active（accent-soft 微渐变底 + 发丝 accent 边 + accent 图标）。
- **禁止**用彩色侧边竖条（side-stripe）标记选中；用背景染色 + 图标高亮表达。

### Command Palette（⌘K，签名组件）
全局浮层，居中，玻璃质感（此处允许）。三组条目：导航 / AI 操作 / 快捷。AI 操作条目用 accent 图标标记，可直接把自然语言指令派发给 Agent。它是"AI 无处不在"的主入口。

### Assistant Orb（AI 管家能量球，签名组件）
AI 主页中央的发光球体，是角色 IP 的 Phase 1 形态：呼吸光晕 + 缓慢旋转环 + 会跟随鼠标转动的眼睛；思考态时核心提亮脉动。它让"AI 在场"具象化，未来可平滑替换为 Rive/Lottie 角色。

## 6. Do's and Don'ts

### Do:
- **Do** 所有颜色走语义 token（The Single Token Rule），换主题只改变量。
- **Do** 金额 / KPI 一律等宽 tabular 数字（The Tabular Numeral Rule）。
- **Do** 用亮度分层 + 1px 发丝边表达层级；阴影只作状态响应（The Flat-By-Default Rule）。
- **Do** 把 accent 当稀有信号色，占比 ≤ 10%（The One Signal Rule）。
- **Do** 用背景染色 + 图标高亮表达导航选中态。
- **Do** 把玻璃质感只留给命令面板等浮层（The Glass-Only-Floats Rule）。
- **Do** 为每套主题写一句"物理场景"来强制明暗决策：Titanium = 白天办公室、明亮日光下看报表；Blueprint = 傍晚 / 夜间加班、暗室里盯资金看板；Kiln = 长时间连续办公、需要暖而不刺眼的沉浸环境。

### Don't:
- **Don't** 硬编码 `bg-white`、`slate-*` 或 hex 颜色，也不要再写 `[data-theme] .bg-slate-x {}` 覆盖补丁。
- **Don't** 用深灰渐变 Hero 横幅 + 大数字小标签的 hero-metric 模板。
- **Don't** 堆千篇一律、等大等长的图标卡片墙；用大小 / 权重制造层级与节奏。
- **Don't** 做"深蓝紫霓虹 / 纯黑底霓虹 / 满屏玻璃拟态"的一眼假 AI 外观。
- **Don't** 用彩色侧边竖条（`border-left` > 1px 的彩色条）标记卡片 / 列表 / 告警 / 导航。
- **Don't** 用渐变文字（`background-clip: text` + 渐变）；强调靠字重与字号。
- **Don't** 加不传达状态的装饰动画（飘浮圆点、无意义 pulse-glow）；也不要给静止卡片挂重投影。
- **Don't** 用纯 `#000` / `#fff`；中性色一律向品牌色相染极低彩度。
