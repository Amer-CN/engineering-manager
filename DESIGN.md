---
name: 工程管家 · Bedrock
description: 工程行业的精密仪器 —— 保留成熟 AI 骨架，重铸设计的皮与魂
colors:
  # canonical = Paper（暖白纸，默认旗舰亮色）；Snow / Graphite 见 Colors
  bg: "oklch(98.6% 0.009 85)"
  panel: "oklch(99.4% 0.006 85)"
  card: "oklch(99.7% 0.005 85)"
  hairline: "oklch(90% 0.012 82)"
  content: "oklch(23% 0.014 70)"
  content-2: "oklch(41% 0.012 72)"
  content-muted: "oklch(54% 0.01 76)"
  accent: "oklch(28% 0.02 74)"
  accent-2: "oklch(40% 0.02 74)"
  on-accent: "oklch(98.5% 0.007 85)"
  state-ok: "oklch(50% 0.1 150)"
  state-warn: "oklch(60% 0.11 70)"
  state-danger: "oklch(52% 0.16 25)"
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

## Overview

**Creative North Star: "精密仪器 / The Precision Instrument"**

Bedrock 把工程管家当成一台**专业驾驶舱级的精密仪器**来对待，而不是又一个后台管理模板。它的气质来自机械腕表和工程蓝图：冷静、笃定、每一个数字都对得整整齐齐，边界是发丝级的细线而不是笨重的粗框，深度靠一层层表面和发丝级边界营造，几乎不用阴影，更不靠发光或霓虹。它是一位沉稳的行业专家管家的视觉化身。

这套系统显式拒绝：泛蓝企业 SaaS 模板、深灰渐变的 hero-metric 横幅、千篇一律的图标卡片墙、"深蓝紫霓虹 / 满屏玻璃拟态"的一眼假 AI 外观，以及任何不传达状态的装饰动画。density（信息密度）为工程数据服务，但密而不乱；delight（惊喜）只集中在外壳、AI 主页、驾驶舱和入场等高光时刻。

三套主题不是"换个色"，而是同一台仪器在三种光线环境下的呈现，各自都有明确的使用场景（见 Colors）。

**Key Characteristics:**
- 单一 OKLCH 语义 token 体系，零硬编码颜色，主题只换变量不改结构。
- 发丝级边界 + 分层表面 + 极柔和中性阴影，几乎不用硬投影，绝不发光。
- 金额与 KPI 强制等宽 tabular 数字，读起来像仪表读数。
- 主色是墨色（亮近黑 / 暗近白）；真正的彩色（绿 / 琥珀 / 红）只用于语义状态，占比极小。
- 玻璃质感只用于浮层（命令面板、弹层），绝不铺满内容区。

## Colors

调色板是"墨与纸"：近乎单色的中性面（暖白纸 / 冷白 / 石墨黑），主色是一味墨色，真正的彩色只留给语义状态。三套主题是同一套中性色在三种明暗下的呈现。frontmatter canonical 取自默认旗舰 Paper。参考 Stitch 实拍提炼：Primary ≈ #2B2B2B、Neutral 灰阶、危险红。

### Primary（墨色主色，非彩色）
- **Ink / 墨**（Paper `oklch(28% 0.02 74)` ≈ #2B2B2B；Graphite 暗色主题翻转为近白 `oklch(92% 0.004 80)` ≈ #D4D4D4）：用于主按钮、当前选中、焦点环。它**不是"信号色"**，靠明度对比承担强调 —— 全屏几乎不出现饱和色。

### Neutral（三主题的底与面）
- **Paper / 暖白纸**（默认旗舰）：底 `oklch(98.6% 0.009 85)`，暖白如优质打印纸，不发灰。
- **Snow / 清冷白**：底 `oklch(99% 0.0015 250)`，最干净锐利的报表视图。
- **Graphite / 石墨黑**：底 `oklch(20.5% 0.003 75)` ≈ Notion #191919 柔和石墨，字 `oklch(86% 0.003 80)` ≈ #D4D4D4，中性无色偏（不偏蓝）。
- **Panel / Card**：在底色上以 OKLCH 亮度递增分层，用亮度差 + 1px 发丝边拉开层级，不靠投影。
- **Content 三级**（正文 / 次级 / 弱化）：均为极低彩度中性，无纯黑纯白。

### State（唯一的彩色，只用于语义）
- **成功绿 / 警告琥珀 / 危险红**（低饱和）：仅用于状态药丸、告警、趋势方向（如"逾期"红药丸），是全屏几乎唯一出现的彩色。

### Named Rules
**The Single Token Rule.** 所有颜色必须走语义 token（surface / content / border / accent / state-*）。禁止在组件里硬编码 `bg-white`、`slate-*`、hex 值。换主题只改 `:root` 变量，绝不再写 `[data-theme] .bg-slate-100 {}` 这类覆盖补丁。

**The Color-For-Meaning-Only Rule.** 界面主色是**墨色**（非彩色），靠明度对比承担强调。真正的彩色（绿 / 琥珀 / 红）只允许表达**语义状态**，任意一屏彩色占比应极小。禁止把彩色当装饰底色，禁止电光蓝 / 霓虹等"信号色"式点缀。

### shadcn ↔ Bedrock Token 映射

接入 shadcn/ui 时，**桥接发生在 `tailwind.config.js`**：shadcn 组件用 Tailwind 类名（`bg-primary` / `bg-accent` / `text-muted-foreground` 等），我们把这些 Tailwind 颜色名映射到项目现有 CSS 变量，因此**不改动、也不与项目现有 `--accent` / `--muted` 的语义冲突**。

| shadcn Tailwind 名 | → Bedrock CSS 变量 | 语义提示 |
|---|---|---|
| `background` / `foreground` | `--bg` / `--fg` | 页面底 / 正文 |
| `card` / `card-foreground` | `--card` / `--fg` | 卡面 / 卡上文字 |
| `popover` / `popover-foreground` | `--panel` / `--fg` | 浮层（命令面板、下拉） |
| `primary` / `primary-foreground` | `--accent` / `--on-accent` | shadcn 的 primary = 我们的**墨色主色 accent**（亮近黑 / 暗近白） |
| `secondary` / `secondary-foreground` | `--panel-2` / `--fg` | 次级填充面 |
| `muted` / `muted-foreground` | `--panel-2` / `--muted` | ⚠ shadcn 的 muted 是**面**，muted-foreground 才是我们的弱化**文字** |
| `accent` / `accent-foreground` | `--card-hover` / `--fg` | ⚠ shadcn 的 accent ≠ 品牌色，是 **hover / 选中高亮面** |
| `destructive` | `--danger` | 危险操作 |
| `border` / `input` | `--border` | 边框 / 输入框描边 |
| `ring` | `--accent` | 焦点环 |

**The Bridge-Not-Overwrite Rule.** 绝不在 CSS 里用 shadcn 的语义重定义项目已有的 `--accent` / `--muted`（会破坏全站品牌色与文字色）。映射一律走 tailwind.config.js 的颜色名，CSS 变量层保持项目原义。新增的唯一 CSS 变量是每主题一份的 `--on-accent`（accent 上的文字色）。

## Typography

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

## Layout

Bedrock 的布局服务于「驾驶舱级信息密度」：主框架为固定侧边栏 + 内容区的两栏结构。侧边栏固定 `w-64`（圆角药丸导航，见 Components → Navigation），内容区为自适应主区域，承载 KPI / 看板 / 表格等工程数据。

### Named Rules
**The Density-With-Air Rule.** 信息密度为工程数据服务，但要「密而不乱」：靠一致的间距节奏（见 frontmatter `spacing`：xs 6 / sm 10 / md 16 / lg 26）与发丝级分隔拉开层次，禁止用粗边框或卡中卡堆叠制造拥挤。

**The Reading-Measure Rule.** 长文本（说明、对话气泡）行宽控制在 65–75ch，避免整行贯穿宽屏导致阅读疲劳。

**Layout tokens（needs-design-decision）**：断点（breakpoints）、栅格列数、内容区最大宽度尚未在 token 层固化，实现中按需内联。如需跨页一致，应补充到 frontmatter 或本节。

## Elevation & Depth

系统以**分层表面（tonal layering）为主、极柔和中性阴影为辅**表达深度，几乎不用硬投影，**绝不发光**。层级顺序：`bg → panel → card`，靠 OKLCH 亮度递增来区分；只有真正浮起的元素（浮层、hover 抬起）才使用**中性的**、极其柔和的大扩散阴影。

### Shadow Vocabulary
- **Soft Ambient / 柔光**（极低强度，中性色）：主按钮 / 浮起元素下方一层极淡的中性柔光，制造轻微浮起感，**非发光、非霓虹**。
- **Floating / 浮层**（`box-shadow: 0 20px 60px -24px oklch(0% 0 0 / 0.7)`）：命令面板、下拉、弹层等脱离平面的浮层。
- **Lift / 抬起**（`box-shadow: 0 4px 16px -8px …`）：卡片 hover 时的轻微抬起反馈。

### Named Rules
**The Flat-By-Default Rule.** 内容表面在静止态是平的，靠亮度分层和发丝边界区分层级。阴影只作为状态响应（hover、浮起、聚焦）出现，绝不给静止卡片挂重投影。

**The Glass-Only-Floats Rule.** backdrop-filter 毛玻璃只允许用于**浮层**（命令面板、弹出菜单、toast）。禁止给标题栏、输入框、卡片等常驻内容元素默认加玻璃 —— 那正是"一眼假 AI"的元凶。

## Shapes

形状语言由统一的圆角标尺与发丝级边界构成，见 frontmatter `rounded`：sm 9px（按钮 / chip / 导航项）、md 10px、lg 16px（卡片 / 容器）、xl 22px（对话输入等大圆角胶囊）。

### Named Rules
**The Hairline Border Rule.** 所有分隔与容器边界统一为 1px 发丝线（`{colors.hairline}`）；hover 时边框转 accent-line。禁止 >1px 的彩色边或彩色侧边竖条（见 Do's and Don'ts）。

**The Radius Scale Rule.** 圆角只取 `rounded` 标尺内的档位，按组件语义选择；同类组件必须使用同一档圆角，禁止逐处自定义 px 圆角。

## Components

### Buttons
- **Shape:** 圆角矩形（9px），高 34px。
- **Primary:** 实心 accent（墨色）底 + `on-accent` 文字（每主题一份的语义 token，绝不写死颜色）；hover 时轻微提亮并上浮 1px，**无发光**。
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
- **Focus:** 边框转 accent + 4px accent-soft 焦点环，不做位移。
- **禁止**给输入框默认加毛玻璃。

### Navigation（侧边栏 · 指挥中心）
- **Style:** 圆角药丸导航项；分组用 Label 字样（大写 + 宽字距）。
- **States:** default（content-2）/ hover（提一层表面）/ active（accent-soft 微渐变底 + 发丝 accent 边 + accent 图标）。
- **禁止**用彩色侧边竖条（side-stripe）标记选中；用背景染色 + 图标高亮表达。

### Command Palette（⌘K，签名组件）
全局浮层，居中，玻璃质感（此处允许）。三组条目：导航 / AI 操作 / 快捷。AI 操作条目用 accent 图标标记，可直接把自然语言指令派发给 Agent。它是"AI 无处不在"的主入口。

### Assistant Mark（AI 管家形象，签名组件）
AI 主页中央的助手形象。当前为**扁平中性占位**（墨色圆形 + 会跟随鼠标转动的眼睛，无发光、无霓虹、无旋转环），是角色 IP 的过渡形态。正式形象由 miora 出稿（首选 **Rive** 交互动画：眼睛跟随鼠标 + 待机 / 思考 / 聆听 / 完成状态；兜底**分层 SVG** 由前端自行驱动），届时无缝替换此占位。**绝不做发光能量球。**

## Do's and Don'ts

### Do:
- **Do** 所有颜色走语义 token（The Single Token Rule），换主题只改变量。
- **Do** 金额 / KPI 一律等宽 tabular 数字（The Tabular Numeral Rule）。
- **Do** 用亮度分层 + 1px 发丝边表达层级；阴影只作状态响应（The Flat-By-Default Rule）。
- **Do** 主色用墨色；真正的彩色只用于语义状态、占比极小（The Color-For-Meaning-Only Rule）。
- **Do** 用背景染色 + 图标高亮表达导航选中态。
- **Do** 把玻璃质感只留给命令面板等浮层（The Glass-Only-Floats Rule）。
- **Do** 为每套主题写一句"物理场景"来强制明暗决策：Paper = 白天办公室、像优质打印纸；Snow = 需要最干净锐利的报表视图；Graphite = 夜间 / 偏好暗色、Notion 式柔和石墨。

### Don't:
- **Don't** 硬编码 `bg-white`、`slate-*` 或 hex 颜色，也不要再写 `[data-theme] .bg-slate-x {}` 覆盖补丁。
- **Don't** 用深灰渐变 Hero 横幅 + 大数字小标签的 hero-metric 模板。
- **Don't** 堆千篇一律、等大等长的图标卡片墙；用大小 / 权重制造层级与节奏。
- **Don't** 做"深蓝紫霓虹 / 纯黑底霓虹 / 满屏玻璃拟态"的一眼假 AI 外观。
- **Don't** 用彩色侧边竖条（`border-left` > 1px 的彩色条）标记卡片 / 列表 / 告警 / 导航。
- **Don't** 用渐变文字（`background-clip: text` + 渐变）；强调靠字重与字号。
- **Don't** 加不传达状态的装饰动画（飘浮圆点、无意义 pulse-glow）；也不要给静止卡片挂重投影。
- **Don't** 用纯 `#000` / `#fff`；中性色一律向品牌色相染极低彩度。

## Implementation Status

> 本节记录「设计契约」与「当前实现」的差距，供接手的人类与 Agent 判断哪些是目标态、哪些是现状。标注 `needs-design-decision` 的项需产品 / 设计定夺后再落地。

**契约与实现存在显著漂移（needs-design-decision）。** 本 DESIGN.md 描述的是 Bedrock 目标设计语言（单一 OKLCH 语义 token 体系、零硬编码颜色、禁止 slate-*/bg-white/hex）；但当前前端实现仍以旧的 Tailwind 工具类体系为主：

- `slate-*` 工具类：约 **3025 处 / 275 个文件**（The Single Token Rule 要求为 0）。
- `bg-white`：约 **249 处 / 119 个文件**。
- 硬编码 hex 颜色：约 **150 处 / 21 个文件**（多集中在 `*Colors.ts` / `printExport.ts` 导出与图表配色，属可接受例外，应显式登记）。
- Bedrock 的 OKLCH token 仅存在于 `src/index.css`（约 110 个 oklch 值），且 `tailwind.config.js` 只暴露 `primary/success/warning/danger/info`，**未暴露** `bg/panel/card/content/accent/hairline` 等语义名——组件目前无法书写 `bg-panel`/`text-content`，只能退回 `slate-*`。
- White 主题的 `:root`（`src/index.css`）用 **hex** 定义（如 `--bg:#f8fafc`、`--accent:#2563eb`），与「零硬编码颜色 / OKLCH 体系」的表述不符。

**与 AGENTS.md 的规则冲突（needs-design-decision）。** `AGENTS.md` 现行 UI 规范将 `slate-*` 列为许可中性色、禁止 `gray-*`；本文件却禁止 `slate-*`。同一仓库存在两套相互矛盾的颜色契约，Agent 无法据此可靠实现。需明确：Bedrock 是目标态（则应给出迁移路径并同步 AGENTS.md），还是现状（则应修订本文件表述）。

**建议的落地路径（需决策后执行）：**
1. 在 `tailwind.config.js` 暴露 Bedrock 语义 token（`bg/panel/card/content/content-2/muted/accent/hairline/state-*`），映射到 `src/index.css` 的 CSS 变量。
2. 分模块用 codemod 将 `slate-*` / `bg-white` 迁移到语义 token，从主路径页面开始。
3. 统一 AGENTS.md 与本文件的颜色契约表述，消除矛盾。
4. 为 `*Colors.ts` / 导出配色登记「可接受例外」清单（见下）。

### 契约优先级（Precedence）

在 Bedrock 迁移完成前，本文件的 **Colors / Do's and Don'ts** 描述的是**目标态**；**当前实现层的颜色契约以 `AGENTS.md`（slate-* 中性色 + primary/success/warning/danger 语义色，由 `scripts/check-rules.cjs` 强制）为准**。即：新代码继续遵循 AGENTS.md，`slate-*` 在迁移前不算违规；「禁止 slate-*」等条款在语义 token 接入 Tailwind 且完成迁移后才转为强制。以此消除两份文档的表述冲突。

### 可接受例外清单（Acceptable Exceptions）

以下位置允许出现硬编码颜色 / 内联样式，不计入设计债（`scripts/check-rules.cjs` 已将 `*Colors.ts` 排除在 hex 检查外）：

- `src/index.css`：主题 token 与 CSS 变量的定义源，本就应出现原始色值。
- `src/**/*Colors.ts`（如 `costLedgerColors.ts` / `dashboardColors.ts` / `hrColors.ts` 等）：图表 / 状态 / 分类的配色映射表。
- `src/**/printExport.ts`、`src/utils/wage-export.ts`、`invoicesPrintExportColors.ts` 等：Excel / 打印导出需要具体色值，非页面渲染。
- `src/components/ui/SimpleBarChart.tsx`、`HoverScrollbar.tsx` 等：图表几何 / 滚动条需按数据动态计算的内联样式。

新增例外须在此登记并说明理由；未登记的硬编码颜色 / 内联样式一律视为设计债。
