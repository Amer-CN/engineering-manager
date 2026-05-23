# 工程管家 — 未完成任务清单

> 更新时间：2026-05-21 18:10
> 项目路径：`E:\测试`
> 当前版本：v2.12.0

---

## ✅ 已完成任务

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 5-1 | 组件测试第一阶段：10个零依赖组件，99个用例 | ✅ 完成 |
| Phase 5-2 | 组件测试第二阶段：Dashboard.tsx，7个用例 | ✅ 完成 |
| Phase 5-3 | 组件测试第三阶段：带 Store 组件，23个用例 | ✅ 完成 |
| Phase 6 | 性能优化：StaffAttendance.tsx + 主要组件 React.memo | ✅ 完成 |
| Phase 7.1–7.8 | SQLite 双写全部完成 | ✅ 完成 |
| Phase 7 验证 | SQLite 读取模式切换/持久化验证 | ✅ 完成 |
| **构建优化 C** | **vendor-charts/template-generate/xlsx 体积优化** | **✅ 完成** |

---

## 🔴 待完成任务

### 优先级 P0（高）

#### 1. 全量测试覆盖率提升
- **当前**：76 个测试文件，1035 个用例，覆盖率待测
- **目标**：提升到 80%+
- **重点**：`src/components/features/` 下未覆盖的组件

---

### 优先级 P1（中）

#### 2. Phase 7 后续 — SQLite 性能压测
- **目标**：验证 SQLite 在大数据量下的性能
- **测试场景**：
  - 1000+ 工人记录查询性能
  - 工资计算结果缓存策略
  - SQLite WAL 模式下的并发写入

#### 3. 构建优化 — 入口 chunk 拆分
- **问题**：`index-*.js` 499KB 超阈值
- **方案**：
  - 检查是否有不必要的依赖被打进了入口 chunk
  - 考虑将部分逻辑移到懒加载组件中

---

### 优先级 P2（低）

#### 4. NODE_OPTIONS 兼容性彻底解决
- **现状**：`vite.config.ts` 顶部 + `onstart()` + `工程管家.bat` 三处清除
- **遗留**：如果系统环境变量也存在，可能需要更彻底的解决方案

#### 5. 打包配置优化
- **当前**：`signAndEditExecutable: false`
- **待做**：
  - 代码签名配置
  - 自动更新（auto-updater）集成

---

## 📊 当前测试全景

| 类型 | 文件数 | 用例数 | 状态 |
|------|--------|--------|------|
| hooks 测试 | 31 | 340 | ✅ |
| 组件测试（零依赖） | 10 | 99 | ✅ |
| 组件测试（带 Store） | 4 | 23 | ✅ |
| 其他测试 | 31 | 573+ | ✅ |
| **合计** | **76** | **1035+** | **✅** |

---

## 🏗️ 构建优化成果（2026-05-21）

| 文件 | 优化前 | 优化后 | 降幅 |
|------|--------|--------|------|
| `TemplateGenerate-*.js` | 511KB | 12KB | **97.6%** ✅ |
| `ContractPage-*.js` | 523KB | 29KB | **94.5%** ✅ |
| `Contracts-*.js` | 543KB | 已拆分 | ✅ |
| `vendor-charts` preload | 首屏加载 523KB | 已移除 | ✅ 按需加载 |
| `xlsx-*.js` | 429KB（已最优） | 429KB | ✅ 动态 import 已就绪 |

**全量测试**：`76 文件 / 1035 用例 / 0 失败` ✅

**改动文件清单**：
1. `electron/ipc-handlers/templates.ts` — 新增 `templates:convert-docx-to-html` IPC handler
2. `electron/preload.ts` — 暴露 `convertTemplateDocxToHtml` API（支持 category 参数）
3. `src/types/electron.d.ts` — 类型声明更新
4. `src/components/features/templates/TemplateGenerate.tsx` — 删除 `import mammoth`，改为 IPC 调用
5. `src/components/features/templates/TemplatePreview.tsx` — 同上
6. `src/components/Contracts.tsx` — 二级 `React.lazy()` 懒加载
7. `src/components/ContractPage.tsx` — `mammoth` 改为动态 `import()`
8. `vite.config.ts` — 新增 `removeChartsPreloadPlugin` 插件
9. `package.json` — `build` 脚本新增 `node scripts/remove-charts-preload.js` 步骤
10. `scripts/remove-charts-preload.js` — 新增构建后脚本

---

## 🔧 关键技术要点（续接对话用）

### vi.mock() 路径匹配规则
`vi.mock()` 的路径必须与**源文件** `import` 语句的路径字符串**完全相同**才能生效。

**正确做法**：
```ts
// 方案：修改源文件 import 为 alias 路径
// WageManagement.tsx 中：import { useToastStore } from '@/store/toastStore'
// 测试中：vi.mock('@/store/toastStore', ...)  ✅ 匹配
```

### 测试运行命令
```bash
# 单文件测试
cd "e:/测试" && npx vitest run --pool=forks "src/__tests__/components/WageManagement.test.tsx"

# 全量测试
cd "e:/测试" && npx vitest run --pool=forks

# 注意：必须用 --pool=forks，不能用 threads 模式
```

### TypeScript 编译检查
```bash
cd "e:/测试" && npx tsc --noEmit --skipLibCheck
```

### act() 警告处理
组件 `useEffect` 中有异步 state 更新时，用 `await act(async () => { ... })` 包裹 render 和交互操作。

### 构建优化 — vendor-charts 按需加载
1. 保留 `vite.config.ts` 的 `manualChunks: { 'vendor-charts': ['recharts'] }`
2. 用 `scripts/remove-charts-preload.js` 在构建后删除 `dist/index.html` 中的 preload 标签
3. 用户访问图表页面时才会加载 523KB chunk（gzip 后 157KB）

---

## 📋 下一步建议

| 选项 | 内容 | 说明 |
|------|------|------|
| **A** | 继续提升测试覆盖率 | 覆盖 `src/components/features/` 下剩余组件 |
| **B** | SQLite 性能压测 | 验证大数据量下的性能表现 |
| **C** | 构建优化（入口 chunk 拆分） | 解决 `index-*.js` 499KB 过大问题 |
| **D** | 新功能开发 | 你指定具体功能 |
| **E** | 暂停 | 当前状态已稳定 |

---

## 📁 重要文件位置

| 文件 | 路径 | 说明 |
|------|------|------|
| 组件测试计划 | `E:\测试\PHASE5_MIGRATION_PLAN.md` | Phase 5 详细计划 |
| 内存文件（今日） | `E:\测试\.workbuddy\memory\2026-05-21.md` | 今日工作记录 |
| 长期记忆 | `E:\测试\.workbuddy\memory\MEMORY.md` | 项目长期记忆 |
| 工程保障报告 | `E:\测试\deliverables\engineering-assurance\` | 各阶段报告 |
| 构建优化脚本 | `E:\测试\scripts\remove-charts-preload.js` | 移除 vendor-charts preload |

---

## 🚨 注意事项

1. **测试必须用 `--pool=forks`**，不能用 threads 模式（会报 `Cannot read properties of undefined (reading 'config')`）
2. **修改源文件后**，如果改回相对路径 import，需要同步修改测试中的 `vi.mock()` 路径
3. **SQLite UI 设置**已集成到 `Settings.tsx` 左侧列（数据存储设置卡片下方）
4. **构建前**必须先运行 `工程管家.bat`（清除 NODE_OPTIONS），不能直接 `vite build`
5. **构建后** `scripts/remove-charts-preload.js` 会自动移除 `vendor-charts` 的 preload 标签

---

> 新对话开始时，请把这个文件的内容发给 AI，AI 就能快速了解进度并继续工作。
