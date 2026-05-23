# 成本台账多版本方案

## 背景

成本台账目前是一个项目一本。财务每月可能出多版台账（调账、补录等），用户需要在不覆盖旧数据的前提下导入新版，并能对比差异。

## 需求

1. 导入新 Excel 时不覆盖旧数据
2. 新旧版本可切换查看明细
3. 可对比两个版本的汇总数据（总收支差额、分类小计差异）
4. 各版本有名称，方便识别

## 数据模型

### 新增 CostLedgerBatch 集合

```ts
// 独立存储版本信息
interface CostLedgerBatch {
  id: number
  projectId: number
  name: string        // "初始版""2025年6月版"
  createdAt: string
}
```

### CostLedgerEntry 新增字段

```ts
interface CostLedgerEntry {
  // … 现有字段不变 …
  batchId: number        // 指向 CostLedgerBatch.id，0=初始版
  // … 现有字段不变 …
}
```

- 已有数据迁移：`db.costLedgerBatches` 插入 `{ id:0, projectId, name:"初始版", createdAt }`，所有旧记录 batchId=0
- 新建版本：在 batches 中加一笔，batchId 自增

### IPC 接口变更

| 接口 | 改动 |
|---|---|
| `getCostLedger(projectId, batchId?)` | 加 batchId 过滤，不传则返回当前选中版本 |
| `getCostLedgerSummary(projectId, batchId?)` | 同上 |
| `getCostLedgerBatches(projectId)` | 新增，返回项目下所有版本列表 |
| `createCostLedgerBatch(projectId, name)` | 新增，创建新版本 |
| `deleteCostLedgerBatch(projectId, batchId)` | 新增，删除指定版本及其数据 |
| `batchCreateCostLedger(projectId, entries, batchId)` | 改为写入指定版本 |

### 批量创建接口调整

```ts
// 旧
batchCreateCostLedger(projectId, entries)
// 新
batchCreateCostLedger(projectId, entries, batchId)
```

## UI 设计

### 台账列表头部

```
┌──────────────────────────────────────────────────┐
│  成本台账                                          │
│                                                   │
│  版本 [初始版 ▼]   [+ 新建版本]  [导入 Excel]  [对比版本]  │
└──────────────────────────────────────────────────┘
```

- **版本下拉**：切换当前查看的版本
- **＋新建版本**：工具栏按钮，弹出命名输入框，创建后自动切到新版本
- **导入 Excel**：导入到当前选中的版本（新建版本后再导入）
- **对比版本**：弹出对话框，选两个版本对比

### 版本对比弹窗

```
┌──────────────────────────────────────┐
│  版本对比                              │
│                                       │
│  版本 A [初始版 ▼]   版本 B [6月版 ▼]    │
│              [查看对比]                │
├──────────────────────────────────────┤
│  ┌──────────┬────────┬────────┬────┐  │
│  │          │ 初始版  │ 6月版   │差额 │  │
│  ├──────────┼────────┼────────┼────┤  │
│  │ 总支出    │ 1,280万│ 1,320万│+40万│  │
│  │ 总收入    │ 1,500万│ 1,530万│+30万│  │
│  │ 结余      │  220万 │  210万 │-10万│  │
│  ├──────────┼────────┼────────┼────┤  │
│  │ 劳务费    │  350万 │  370万 │+20万│  │
│  │ 材料费    │  280万 │  290万 │+10万│  │
│  │ …        │        │        │    │  │
│  └──────────┴────────┴────────┴────┘  │
└──────────────────────────────────────┘
```

先选版本 A/B，点查看对比后显示对比数据。

```
┌──────────────┬──────────┬──────────┬──────────┐
│              │ 初始版    │6月版     │ 差额      │
├──────────────┼──────────┼──────────┼──────────┤
│ 总支出        │ 1,280万  │ 1,320万  │ +40万    │
│ 总收入        │ 1,500万  │ 1,530万  │ +30万    │
│ 结余          │  220万   │  210万   │ -10万    │
├──────────────┼──────────┼──────────┼──────────┤
│ 按分类对比     │          │          │          │
│  劳务费       │  350万   │  370万   │ +20万    │
│  材料费       │  280万   │  290万   │ +10万    │
│  机械费       │  120万   │  130万   │ +10万    │
│  …            │          │          │          │
└──────────────┴──────────┴──────────┴──────────┘
```

## 智能匹配学习机制

### 数据模型

```ts
interface CostLedgerMatchRule {
  keyword: string       // 关键词，如 "矩管"、"集装箱"、"劳务"
  category: string      // 匹配到的系统分类 code
  direction: 'expense' | 'income'
  hitCount: number      // 命中次数，越高越可信
  createdAt: string
  updatedAt: string
}
```

### 学习流程

```
导入时用户纠正分类
  → 从摘要中提取关键词（按 -  ： （ ）／ / 空格 分割）
  → 过滤短词、停用词
  → 每个关键词 + 对应分类 → 存入 costLedgerMatchRules 集合
  → 已有相同关键词则累加 hitCount

下次导入
  → autoMatchCategory 优先查 learned rules（按 hitCount 排序）
  → 命中则直接出分类
  → 没命中才走内置关键词规则
```

### 学习来源

- 用户逐行修改分类（rowOverrides）
- 用户批量修改分类（categoryOverrides）
- 导入完成时自动学习

### UI 显示

导入完成后显示：
```
导入完成 ✓
成功导入 520 条
学习到 8 条新分类规则（材料费+3，临建及办公费+2，劳务费+2，其他业务费+1）
```

## 分步实现计划

### Step 1: 数据层
- 新增 `CostLedgerBatch` 类型定义（electron.d.ts）
- `CostLedgerEntry` 加 `batchId: number` 字段
- 更新 database.ts 初始化：检查 `db.costLedgerBatches`，无数据时新建；给旧记录补 batchId=0
- 新建 `db.costLedgerBatches` 集合及 CRUD IPC：
  - `getCostLedgerBatches(projectId)` → 版本列表
  - `createCostLedgerBatch(projectId, name)` → 新建版本
  - `deleteCostLedgerBatch(projectId, batchId)` → 删除版本+数据
- 修改 `getCostLedger`、`getCostLedgerSummary`、`batchCreateCostLedger` 支持 batchId 参数

### Step 2: 前端 hooks
- 新建 `useCostLedgerBatches` hook

### Step 3: UI 组件
- 版本选择器组件（CostLedgerBatchSelector）
- 版本对比面板组件（CostLedgerCompareModal）
- 整合到 CostLedgerTab + CostLedgerProjectDetail

### Step 4: 导入适配
- 导入弹窗中，创建版本步骤整合
- 导入数据写入当前选中版本

### Step 5: 验证
- 旧数据兼容（不迁移也正常显示）
- 新建版本 → 导入 → 切换查看
- 版本对比
- 版本删除
