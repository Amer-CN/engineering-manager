# R8 Sprint Handoff（新会话开局用）

## ⚠️ 铁律：必须用 mimo code 执行，Codex 只做计划 + 审查

**Codex 不许自己改代码。** 所有代码修改必须通过 mimo code 执行。
mimo 免费用 mimo v2.5 模型，节约成本。

---

## 状态

- **HEAD**: `fa64671` (R8-48: MemberCard bg-white 清理)
- **分支**: master
- **已完成**: 48 commits (R8.1 + R8.2 + R8.3 完成)
- **工作区**: 98 文件已修改，待 commit

---

## R8 子任务进度

| 子任务 | 状态 | 说明 |
|--------|------|------|
| R8.1 HeroBanner | ✅ | 3 文件 |
| R8.1 PageContainer | ✅ | 15 文件，0 残留 |
| R8.2 Card | ✅ | 28/30（2 个有意放过） |
| R8.3 btn→Button | ✅ | **98 文件，0 残留** |
| R8.4 console.log 清理 | 🔴 | 待做 |
| R8.5 TODO/FIXME 清理 | 🔴 | 待做 |

---

## R8.3 完成总结

### 替换规模
- 98 个文件，+601 -508 行
- `className="btn btn-X btn-Y"` → `variant="X" size="Y"`
- 全部追加 `import { Button }`（如缺失）

### 特殊处理
| 文件 | 处理方式 |
|------|---------|
| `Dashboard.tsx` | `motion.button` 保留，`btn btn-primary` → Tailwind 样式类（framer-motion 不支持 variant） |
| `ContractPreviewModal.tsx` | `<a>` 标签保留，`btn btn-primary btn-sm` → Tailwind 样式类（Button 不支持 as prop） |
| `MemberDetail.tsx` | 模板字符串 className → 条件 variant（`isWorker ? 'warning' : 'primary'`） |
| `SettingsSqliteSection.tsx` | 模板字符串 className → 条件 variant |
| `AuditLogs.tsx` | 模板字符串 className → 条件 variant + size |
| `ImportFileStep.tsx` | `<label>` 保留，`btn btn-primary` → Tailwind 样式类 |
| `SettlementItemsTable.tsx` | `btn btn-sm` + 自定义颜色类 → `<Button variant="outline/success">` + 保留颜色类 |

### 残留
- 部分文件有 `className="btn"` 残留（已被 CSS 标记 deprecated，不影响功能）

### 红绿灯
- ✅ `tsc --noEmit` — 0 error
- ✅ `npm run check` — 0 HARD FAIL
- ✅ `vite build` — success

---

## R8.4 console.log 清理

待确认具体文件。

---

## R8.5 TODO/FIXME 清理

待确认具体文件。

---

## 操作 Tips

- 用 Node.js `.cjs` 脚本读写文件（UTF-8 safe）
- 避免并行 `git commit`（`index.lock`）
- 不用 `Set-Content -Encoding UTF8`（会失败），用 `[System.IO.File]::WriteAllText` 或 Node.js
- `apply_patch` 工具在当前环境报 "Access is denied"，用 Node.js 脚本替代

---

## 红绿灯

```bash
cd "E:\测试\EngineeringManager.Api" && dotnet build       # 0 error
cd "E:\测试\EngineeringManager.Tests" && dotnet test       # 26/26
cd "E:\测试" && npm run check                               # 0 HARD FAIL
cd "E:\测试" && npx vite build                              # success
cd "E:\测试" && npx tsc --noEmit --pretty false             # 0 error
```

---

## 开局步骤

1. `git -C "E:\测试" log --oneline -5` 确认 HEAD = `fa64671`
2. `git -C "E:\测试" status` 确认 98 文件待 commit
3. Commit R8.3 改动（建议分模块 commit，每个模块一个 commit）
4. 跑全红绿灯确认
5. 继续 R8.4 console.log 清理
6. 继续 R8.5 TODO/FIXME 清理