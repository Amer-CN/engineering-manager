# 工程管家 — 设计审计范围说明书

**版本**: 1.0  
**日期**: 2025-01-20  
**审核人**: 待定  
**执行团队**: design-audit-engineering-manager  

---

## 一、审计目标

本次设计审计旨在全面评估「工程管家」Electron 桌面应用的设计系统执行一致性，确保：

1. **设计规范落地验证** — 所有 UI 组件严格遵循 `DESIGN.md` 中定义的色彩、字体、间距、动效规范
2. **暗黑模式完整性检查** — 验证所有组件在亮色/暗黑模式下的表现一致性
3. **组件 API 一致性审查** — 确保组件接口设计符合设计系统中的交互规范
4. **视觉一致性评估** — 识别并标记偏离设计规范的视觉异常
5. **可访问性基线检查** — 验证基础可访问性属性（aria 标签、焦点管理、键盘导航）

**成功标准**：
- 100% 组件完成审计
- 识别所有 P0/P1/P2 级别的设计偏差
- 输出可执行的修复建议清单
- 建立设计系统合规性评分体系

---

## 二、审计组件清单（优先级排序）

基于 `src/components/ui/index.ts` 导出列表和 `DESIGN.md` 规范覆盖度，按业务优先级排序：

### P0 — 核心交互组件（高频使用）

| 优先级 | 组件名称 | DESIGN.md 覆盖 | 审计重点 | 预估工时 |
|--------|----------|----------------|----------|----------|
| 1 | **Button** | ✅ 完整 | 6 种变体 + 5 种尺寸 + 动效弹簧参数 | 2h |
| 2 | **Input** | ✅ 完整 | 3 种尺寸 + 4 种状态 + modern 变体 | 2h |
| 3 | **Table** | ✅ 完整 | 3 种密度 + 粘性表头 + 空状态 | 2.5h |
| 4 | **Modal** | ✅ 完整 | Portal 渲染 + 动效弹簧 + 焦点陷阱 | 2h |
| 5 | **Select** | ✅ 完整 | 单/多选 + 搜索 + 下拉动效 | 2h |
| 6 | **Card** | ✅ 完整 | 4 种阴影 + hoverable + glass 变体 | 1.5h |

### P1 — 反馈与导航组件（中频使用）

| 优先级 | 组件名称 | DESIGN.md 覆盖 | 审计重点 | 预估工时 |
|--------|----------|----------------|----------|----------|
| 7 | **Tabs** | ✅ 完整 | 胶囊容器 + 活动状态 + 徽章支持 | 1.5h |
| 8 | **Badge** | ✅ 完整 | 9 种颜色 + dot 动画 + 3 种尺寸 | 1h |
| 9 | **DropdownMenu** | ✅ 完整 | Portal + 分隔符 + 危险操作样式 | 1.5h |
| 10 | **Pagination** | ✅ 完整 | 活动状态 + 边界情况（<5 页） | 1h |
| 11 | **ProgressBar** | ✅ 完整 | 动画缓动 + 5 种颜色 + 百分比标签 | 1h |
| 12 | **Tooltip** | ✅ 完整 | 300ms 延迟 + 箭头方向 | 1h |
| 13 | **FormField** | ⚠️ 部分 | 标签排版 + 错误状态 + 帮助文本 | 1.5h |

### P2 — 辅助与布局组件（低频使用）

| 优先级 | 组件名称 | DESIGN.md 覆盖 | 审计重点 | 预估工时 |
|--------|----------|----------------|----------|----------|
| 14 | **PageContainer** | ✅ 完整 | 3 种宽度 + 内边距 + 居中 | 1h |
| 15 | **Loading (Spinner/Skeleton)** | ✅ 完整 | 3 种尺寸 + 骨架屏布局匹配 | 1.5h |
| 16 | **EmptyState** | ✅ 完整 | 图标透明度 + 排版层级 | 1h |
| 17 | **ConfirmDialog** | ❌ 未覆盖 | 基于 Modal 扩展 + 危险操作样式 | 1h |
| 18 | **Icon** | ❌ 未覆盖 | Lucide 图标一致性 + 尺寸映射 | 1h |

### 不在审计范围内

- **Sidebar** — 属于布局组件，不在 `ui/` 目录下
- **Toast** — 使用 `useToast` hook，需单独审计
- **HeroBanner** — 页面级组件，非通用 UI 组件
- **KpiCard** — 业务特定组件
- **LoginPage** — 页面级组件

---

## 三、审计维度清单

### 维度 1：色彩系统 (Colors)

**审计项**：
- [ ] 主色调使用是否符合 `primary-50` 到 `primary-900` 规范
- [ ] 语义色（success/warning/danger/info）是否正确应用
- [ ] 中性色是否严格使用 Tailwind Slate 色阶
- [ ] 暗黑模式色彩映射是否完整（`dark-*` 前缀）
- [ ] 域色（revenue/expense/task/partner）是否仅在对应业务模块使用
- [ ] 侧边栏配色是否遵循特殊规则（深色渐变 + 白色文本）

**工具方法**：
- 使用 Chrome DevTools 提取 computed color 值
- 对比 DESIGN.md 中的 hex 值
- 截图 + 取色器验证渐变和半透明色

**交付物**：色彩偏差报告（Markdown 表格 + 截图标注）

---

### 维度 2：字体排版 (Typography)

**审计项**：
- [ ] 字体族是否正确应用 Inter 优先栈
- [ ] 7 种字体尺度（Display/H1/H2/H3/Body/Body-sm/Label/Caption/Overline）是否严格对应
- [ ] 行高是否符合规范（1.2 / 1.3 / 1.35 / 1.4 / 1.5）
- [ ] 字重是否限制在 400 + 600 两种（单屏不超过 2 种）
- [ ] 字间距（letterSpacing）是否应用 `-0.025em` / `-0.02em` / `0.1em`
- [ ] 表格头部是否使用 Overline 样式（大写 + tracking-wider）

**工具方法**：
- 使用 WhatFont 浏览器插件识别字体属性
- 对比 Figma 设计稿（如有）
- 检查 `tailwind.config.js` 的 fontSize/lineHeight 映射

**交付物**：排版偏差清单（附带修复 CSS）

---

### 维度 3：间距与布局 (Spacing & Layout)

**审计项**：
- [ ] 8 级间距尺度（xs/sm/md/lg/xl/2xl/3xl/page-padding）是否正确应用
- [ ] Card 内部间距是否为 `card-gap: 16px`
- [ ] 区块间距是否为 `section-gap: 24px`
- [ ] 页面内边距是否为 `page-padding: 24px`
- [ ] Border radius 是否遵循三元规则（interactive=lg / container=xl / overlay=2xl / inline=full）
- [ ] 兄弟元素是否避免混用 `rounded-lg` 和 `rounded-xl`

**工具方法**：
- 使用 Spacing.outline 浏览器插件可视化间距
- 测量截图中的像素距离
- 检查 Tailwind class 命名是否符合规范

**交付物**：间距违规地图（标注具体像素偏差）

---

### 维度 4：动效系统 (Motion)

**审计项**：
- [ ] 所有交互元素是否应用 spring 动画（而非 linear/easeInOut）
- [ ] Button hover/tap 是否使用 `spring stiffness=400 damping=17`
- [ ] Modal 打开/关闭是否使用 `spring stiffness=300 damping=25`
- [ ] Card hover 是否触发 `y: -3px` + shadow 加深
- [ ] 页面切换是否使用 `AnimatePresence` + opacity 过渡（0.2s）
- [ ] 列表项是否应用 stagger 动画（nav=30ms / section=70ms）
- [ ] 大型元素（>200×200px）是否避免使用 scale 动画
- [ ] CSS 关键帧动画是否添加 `will-change: transform` 和 GPU 提示

**工具方法**：
- 使用 Chrome DevTools → Animations 面板录制动效
- 检查 framer-motion 的 `transition` 配置
- 使用 `prefers-reduced-motion` 媒体查询测试降级

**交付物**：动效审计报告（附带视频录制 + 参数对比）

---

### 维度 5：组件 API 与交互规范 (Component API)

**审计项**：
- [ ] 组件 props 是否完整覆盖 DESIGN.md 中定义的所有变体
- [ ] 事件回调命名是否一致（onChange / onSelect / onConfirm）
- [ ] 是否正确处理 `disabled` 状态（opacity-50 + cursor-not-allowed）
- [ ] 是否实现 `loading` 状态（Button + Input + Select）
- [ ] 是否支持 `ref` 转发（forwardRef）
- [ ] 是否正确处理 `aria-*` 属性
- [ ] 是否实现焦点管理（Modal 焦点陷阱、Select 自动聚焦搜索框）
- [ ] 是否支持受控/非受控模式（Input / Select）

**工具方法**：
- 代码审查（`src/components/ui/*/index.tsx`）
- 单元测试覆盖度检查（如有测试）
- 手动交互测试（键盘导航 + 屏幕阅读器）

**交付物**：API 一致性矩阵（Markdown 表格，标注缺失功能）

---

### 维度 6：暗黑模式支持 (Dark Mode)

**审计项**：
- [ ] 所有组件是否使用 `dark:` 修饰符或 CSS 自定义属性
- [ ] 暗黑模式背景层级是否遵循（`#0f172a` → `#1e293b` → `#334155`）
- [ ] 文本颜色是否在暗黑模式下反转（white → slate-100）
- [ ] 边框颜色是否调整为 `dark:border-slate-700`
- [ ] 阴影是否在暗黑模式下淡化或移除
- [ ] 半透明色（glass）是否在暗黑模式下调整透明度
- [ ] 图标是否切换为 `*-white` 或 `*-light` 变体

**工具方法**：
- 使用 Electron 开发者工具切换主题
- 对比亮色/暗黑模式截图
- 检查 `tailwind.config.js` 的 darkMode 配置

**交付物**：暗黑模式兼容性矩阵（标注未适配组件）

---

### 维度 7：可访问性基线 (Accessibility)

**审计项**：
- [ ] 所有交互元素是否可通过 Tab 键聚焦
- [ ] 是否实现焦点可见性（`focus-visible:ring-2`）
- [ ] 是否正确使用语义化 HTML（`button` / `input` / `nav` / `table`）
- [ ] 是否添加 `aria-label` / `aria-labelledby` / `aria-describedby`
- [ ] 是否处理 `aria-invalid` / `aria-disabled` / `aria-busy`
- [ ] 颜色对比度是否达到 WCAG 2.1 AA 标准（4.5:1）
- [ ] 是否支持 `prefers-reduced-motion`

**工具方法**：
- 使用 axe DevTools 浏览器插件自动扫描
- 使用 WAVE 浏览器插件检查对比度
- 键盘导航测试（禁用鼠标）

**交付物**：可访问性审计报告（附带 WCAG 合规评分）

---

## 四、审计方法论

### 阶段 1：准备阶段（1 天）

1. **环境搭建**
   - 克隆项目仓库到本地
   - 安装依赖（`npm install`）
   - 启动开发服务器（`npm run dev`）
   - 安装审计工具（Chrome 插件 + Node.js 脚本）

2. **基线建立**
   - 截图所有组件的亮色模式默认状态
   - 截图所有组件的暗黑模式默认状态
   - 创建组件Demo页面（`/audit-demo` 路由）

### 阶段 2：执行阶段（3-5 天）

**每日工作流**：
```
上午：审计 2-3 个 P0/P1 组件（深度审查）
下午：审计 3-4 个 P1/P2 组件（广度审查）
晚上：整理发现 + 更新审计日志
```

**审查技术**：
- **自动化扫描** — 使用自定义 ESLint 规则检查 Tailwind class 命名
- **视觉对比** — 使用 Percy 或 BackstopJS 进行截图对比
- **手动测试** — 交互测试 + 键盘导航 + 屏幕阅读器
- **代码审查** — 检查组件实现是否符合 DESIGN.md

### 阶段 3：报告阶段（1 天）

1. **汇总发现** — 整理所有偏差到中央表格
2. **优先级排序** — 按 P0/P1/P2 分类（见下表）
3. **编写报告** — 生成 Markdown 报告 + 修复建议
4. **演示准备** — 准备汇报材料（截图对比 + 视频录制）

---

## 五、偏差分类标准

| 级别 | 定义 | 示例 | 修复优先级 |
|------|------|------|-----------|
| **P0 — 阻断** | 完全偏离设计规范，影响核心功能 | Button 使用错误色彩变体、Modal 无法关闭 | 立即修复 |
| **P1 — 严重** | 部分偏离规范，影响用户体验 | 间距错误 >4px、动效参数不正确 | 本周修复 |
| **P2 — 一般** | 轻微偏离规范，不影响功能 | 字体大小偏差 1px、阴影强度不一致 | 下个迭代修复 |
| **P3 — 建议** | 符合规范但可优化 | 可添加微交互、改进动画曲线 | 待办清单 |

---

## 六、预期交付物

### 交付物 1：设计审计主报告 (`AUDIT_REPORT.md`)

**结构**：
```markdown
# 工程管家 — 设计审计报告

## 执行摘要
- 审计范围：18 个组件
- 审计维度：7 个维度
- 发现总偏差数：XX 个（P0: X / P1: X / P2: X / P3: X）
- 合规评分：XX/100

## 分组件详细报告
### Button
- 合规评分：85/100
- 发现偏差：
  - [P1] ghost 变体 hover 背景色错误（应为 transparent，实际为 slate-100）
  - [P2] xl 尺寸 padding 应为 px-8 py-4，实际为 px-6 py-3
- 修复建议：
  - 修改 Button.tsx:45 的 hover class
  - 更新 Button.tsx:120 的 sizeConfig

## 分维度统计
### 色彩系统
- 合规组件：16/18
- 主要问题：暗黑模式映射不完整

## 附录
- 截图对比（Before/After）
- 修复优先级矩阵
- 设计系统改进建议
```

### 交付物 2：偏差追踪表 (`AUDIT_TRACKER.csv`)

**字段**：
```csv
ID,Component,Dimension,Severity,Description,Location,Expected,Actual,Screenshot,Status,Assignee
AUDIT-001,Button,Color,P1,ghost hover bg wrong,Button.tsx:45,transparent,slate-100,https://...,Open,
```

### 交付物 3：修复补丁建议 (`AUDIT_FIXES.md`)

**结构**：
```markdown
# 工程管家 — 设计审计修复建议

## P0 级别（立即修复）

### FIX-001: Button primary hover 色彩错误
**文件**: `src/components/ui/Button/Button.tsx`
**行号**: 78
**当前代码**:
```tsx
hover:bg-blue-700
```
**修复代码**:
```tsx
hover:bg-primary-700
```
**验证方法**: 悬停 Button primary 变体，截图对比 DESIGN.md
```

### 交付物 4：设计系统改进建议 (`DESIGN_SYSTEM_IMPROVEMENTS.md`)

**内容**：
- 识别 DESIGN.md 中未覆盖的组件（ConfirmDialog / Icon）
- 建议新增的设计令牌（如 animation-spring-*-***）
- 建议优化的规范描述（更精确的像素值、更多代码示例）

### 交付物 5：审计过程文档 (`AUDIT_PROCESS.md`)

**内容**：
- 审计执行日志（每日工作记录）
- 工具配置说明（ESLint 规则、截图对比脚本）
- 审计方法论反思（哪些有效、哪些需改进）

---

## 七、成功指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 组件合规率 | ≥90% | 合规组件数 / 总组件数 |
| P0 偏差修复率 | 100% | 修复 P0 数 / 发现 P0 数 |
| P1 偏差修复率 | ≥80% | 修复 P1 数 / 发现 P1 数 |
| 暗黑模式覆盖率 | 100% | 支持暗黑的组件数 / 总组件数 |
| 可访问性评分 | ≥85/100 | axe DevTools 自动扫描得分 |
| 设计系统覆盖率 | 100% | DESIGN.md 覆盖的组件数 / 总组件数 |

---

## 八、风险与缓解措施

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| 组件实现与 DESIGN.md 严重不一致 | 高 | 中 | 优先审计 P0 组件，立即上报偏差 |
| 暗黑模式适配不完整 | 中 | 高 | 单独安排暗黑模式专项审计 |
| 审计工具无法自动化检测某些维度 | 中 | 中 | 增加手动审查时间预算 |
| 设计系统文档本身有歧义 | 高 | 低 | 与设计师/产品经理确认意图 |

---

## 九、时间与资源规划

**总预估工时**: 5-7 个工作日

**人员配置**:
- 需求发现分析师（许明需）→ 已完成范围确认
- 设计系统架构师（苏墨白）→ 待命解答 DESIGN.md 歧义
- 质量评审专家（戚评审）→ 最终质量门控
- 前端开发工程师（计实现）→ 执行修复（审计后阶段）

**里程碑**:
- ✅ 第 0 天：审计范围确认（本次交付）
- 📅 第 1 天：环境搭建 + 基线建立
- 📅 第 2-4 天：执行审计（P0 → P1 → P2）
- 📅 第 5 天：报告编写 + 质量评审
- 📅 第 6-7 天：缓冲时间（应对复杂偏差）

---

## 十、审批与签名

| 角色 | 姓名 | 签名 | 日期 |
|------|------|------|------|
| 需求发现分析师 | 许明需 | ✅ | 2025-01-20 |
| 设计系统架构师 | 苏墨白 | 待审批 | |
| 质量评审专家 | 戚评审 | 待审批 | |
| 工程负责人 | 待定 | 待审批 | |

---

## 附录 A：参考资料

1. **DESIGN.md** — 工程管家设计系统规范（941 行）
2. **src/components/ui/index.ts** — UI 组件导出清单
3. **Tailwind CSS 文档** — https://tailwindcss.com/docs
4. **Framer Motion 文档** — https://www.framer.com/motion/
5. **WCAG 2.1 指南** — https://www.w3.org/WAI/WCAG21/quickref/
6. **Electron 桌面应用最佳实践** — https://www.electronjs.org/docs/latest/tutorial/accessibility

---

## 附录 B：审计检查清单（快速参考）

<details>
<summary>点击展开完整检查清单（120+ 检查项）</summary>

### Button 组件（12 检查项）
- [ ] primary 变体 bg = primary-600
- [ ] primary hover bg = primary-700
- [ ] secondary 变体 border = slate-200
- [ ] danger 变体 bg = danger-500
- [ ] ghost 变体 hover bg = transparent
- [ ] outline 变体 border = primary-300
- [ ] xs 尺寸 padding = px-2 py-1
- [ ] xl 尺寸 padding = px-8 py-4
- [ ] loading 状态显示 Spinner
- [ ] disabled 状态 opacity = 0.5
- [ ] hover 动效 spring stiffness = 400
- [ ] tap 动效 scale = 0.97

### Input 组件（10 检查项）
- [ ] md 尺寸 padding = 10px 16px
- [ ] focus ring color = primary-500
- [ ] error 状态 border color = danger-500
- [ ] modern 变体 bg = slate-50
- [ ] modern 变体 borderRadius = rounded-xl
- [ ] 左图标渲染正确
- [ ] 右图标渲染正确
- [ ] help text 显示在输入框下方
- [ ] error message 使用 AnimatePresence
- [ ] aria-invalid 正确设置

### ...（完整清单包含 18 个组件 × 平均 8 检查项 = 144 检查项）

</details>

---

**文档版本历史**:

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| 1.0 | 2025-01-20 | 许明需 | 初始版本，定义审计范围 |

---

**结束 of 审计范围说明书**
