# 工程管家 — 待办任务清单

> 更新时间：2026-05-21 03:04
> 当前版本：v2.12.0 | Phase 7 主体完成，进入验证和收尾阶段

---

## 🔴 高优先级（需尽快完成）

### 1. Phase 7 完整流程手动验证
- [ ] **冷启动验证**：关闭应用 → 重新打开 → 确认数据完整加载（677条成本 + 138条规则）
- [ ] **SQLite 全流程**：设置页启用 SQLite → 迁移数据 → 切换双写模式 → 各模块数据核对
- [ ] **重启保持验证**：重启应用 → 确认读取模式持久化（应为上次设置的值）、数据不丢失
- [ ] **重新迁移按钮验证**：确认"重新迁移数据"按钮在已迁移状态下可见且可点击

**背景**：Phase 7.1–7.8 代码已全部完成，dist-electron/main.js 已重建，数据丢失防护已部署，但完整流程尚未端到端验证。

---

## 🟡 中优先级（本版本收尾）

### 2. Phase 5 续：组件测试覆盖
- [ ] 为 `DropZone` 组件编写测试
- [ ] 为 `Icon` 组件编写测试
- [ ] 继续推进 `src/__tests__/components/` 目录下的组件测试覆盖
- 当前状态：54 测试文件 / 867 用例 passing ✅

### 3. Phase 6 续：性能优化收尾
- [ ] 确认 `StaffAttendance` 的 `useMemo` 优化是否已完整应用（MEMORY.md 标记为已完成，需二次确认）
- [ ] 检查是否还有其他组件可以做 `React.memo` 优化

### 4. 构建警告处理
- [ ] `vendor-charts.js` 523KB 超 500KB 阈值 → 考虑 code split 或动态 import
- [ ] `TemplateGenerate.js` 504KB 超 500KB 阈值 → 同上

---

## 🟢 低优先级（下版本规划）

### 5. `CostLedgerImportModal.tsx` 拆分
- 当前 907 行，待拆分成更小的模块
- 涉及 Excel 导入、字段映射、分类学习等子功能

### 6. Electron 启动 NODE_OPTIONS 问题
- 主进程有预存错误（不影响编译，但会在启动时产生警告）
- 需要排查具体是哪个配置或环境变量导致的

### 7. `costLedgerBatches` 相关编译错误
- 检查是否有遗漏的类型错误或未使用的变量
- TypeScript `noUnusedLocals: true` 模式下需确保所有变量都被使用

---

## 📋 当前技术状态速查

| 项目 | 状态 |
|------|------|
| TypeScript 编译 | 0 非测试错误 ✅ |
| Vitest 测试 | 54 files / 867 tests passing ✅ |
| Phase 7（SQLite） | 代码完成，待手动验证 ⏳ |
| Phase 5 续（组件测试） | 进行中 🔄 |
| Phase 6 续（性能优化） | 据 MEMORY.md 已完成，待确认 ✅? |
| 数据丢失防护 | 已部署 ✅ |
| `dist-electron/main.js` | 已重建（含所有修复）✅ |

---

## 🗂️ 关键文件路径速查

```
E:\测试\
├── electron/
│   ├── main.ts                          # 主进程入口
│   ├── database.ts                      # JSON 数据库（含数据防护）
│   ├── sqlite/
│   │   ├── db-init.ts                  # SQLite 初始化
│   │   ├── migrate.ts                  # JSON→SQLite 迁移脚本
│   │   └── queries/                   # SQLite 查询模块
│   │       ├── workers.ts              # 工人查询（已修复 listProjectWorkers）
│   │       ├── cost-ledger.ts          # 成本台账查询
│   │       └── ...
│   └── ipc-handlers/
│       └── sqlite-status.ts            # SQLite 启用/迁移/状态 IPC
├── src/
│   ├── hooks/useSqliteSettings.ts     # SQLite 设置 hook（含 handleRemigrate）
│   ├── components/
│   │   ├── Settings.tsx               # 设置页（已集成 SQLite 面板）
│   │   └── SettingsSqliteSection.tsx  # SQLite 设置子面板
│   └── types/
│       ├── electron.d.ts               # IPC 类型声明
│       └── common/                     # Result<T>, 类型守卫
├── dist-electron/
│   └── main.js                        # 已重建（2026-05-21）
└── F:\Company Database\
    ├── engineering.json                # 主数据文件（已恢复）
    └── engineering.db                  # SQLite 数据库（848KB）
```

---

## 🔁 新会话快速启动

开新会话后，告诉我：
> "继续工程管家，读取 TODO.md 和 MEMORY.md"

我会自动加载上下文并从上次中断的地方继续。
