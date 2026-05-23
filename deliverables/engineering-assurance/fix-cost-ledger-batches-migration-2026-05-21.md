# 成本台账版本名称不显示 — 修复报告

## 问题描述
- 使用"仅JSON模式"一切正常
- 使用"双写模式"或"SQLite优先"：成本台账版本切换器不显示名称，不显示其他版本

## 根本原因
`electron/sqlite/migrate.ts` 的 `TABLE_MIGRATIONS` 配置中，成本台账版本（批次）的迁移配置错误：

```typescript
// ❌ 错误（之前修复时写错了字段名）
{
  jsonKey: 'costLedgerVersions',  // ← 错误的字段名
  sqliteTable: 'cost_ledger_batches',
  ...
}
```

**实际数据存储在 `engineering.json` 的 `costLedgerBatches` 字段中**（不是 `costLedgerVersions`）！

验证：
```python
import json
with open('F:/Company Database/engineering.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
    print('costLedgerBatches 数量:', len(data.get('costLedgerBatches', [])))  # → 2
    print('costLedgerVersions 数量:', len(data.get('costLedgerVersions', [])))  # → 0
```

## 修复内容
修改 `electron/sqlite/migrate.ts` 第 486 行：
```typescript
// ✅ 修复后
{
  jsonKey: 'costLedgerBatches',  // ← 正确的字段名
  sqliteTable: 'cost_ledger_batches',
  columnMap: {
    id: 'id',
    projectId: 'project_id',
    name: 'name',
    createdAt: 'created_at',
  },
}
```

## 文件变更
| 文件 | 变更 |
|------|------|
| `electron/sqlite/migrate.ts` | `jsonKey: 'costLedgerVersions'` → `'costLedgerBatches'` |
| `dist-electron/main.js` | 重建（2.2MB） |

## 验证步骤
1. 重启应用
2. 设置 → SQLite 设置 → 点击"重新迁移数据"
3. 等待迁移完成
4. 打开成本台账 → 检查版本切换器是否显示正确名称

## 预期结果
- 版本切换下拉框显示：`初始版`、`2025.6.20`（共2个版本）
- 切换版本后，对应版本的数据正确显示

## 时间
2026-05-21 02:38
