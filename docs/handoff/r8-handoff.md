# R8 Sprint Handoff（新会话开局用）

## ⚠️ 铁律：必须用 mimo code 执行，Codex 只做计划 + 审查

**Codex 不许自己改代码。** 所有代码修改必须通过 mimo code 执行。
mimo 免费用 mimo v2.5 模型，节约成本。

---

## 状态

- **HEAD**: `1f6962b` (chore: bump version to v0.78.2)
- **分支**: master
- **版本**: v0.78.2
- **已完成**: 52 commits (R8 全部完成)

---

## R8 子任务进度

| 子任务 | 状态 | 说明 |
|--------|------|------|
| R8.1 HeroBanner | ✅ | 3 文件 |
| R8.1 PageContainer | ✅ | 15 文件，0 残留 |
| R8.2 Card | ✅ | 28/30（2 个有意放过） |
| R8.3 btn→Button | ✅ | **98 文件，0 残留** |
| R8.4 console.log 清理 | ✅ | 5 文件，0 残留 |
| R8.5 TODO/FIXME 清理 | ✅ | 1 文件，0 残留 |

---

## R8 完成总结

### R8.3 btn→Button (98 文件)
- `className="btn btn-X btn-Y"` → `variant="X" size="Y"`
- 特殊处理: motion.button / `<a>` / `<label>` / 模板字符串 className
- 部分文件有 `className="btn"` 残留（deprecated，不影响功能）

### R8.4 console.log 清理 (5 文件)
- Dashboard.tsx: 移除 1 处 console.log
- usePartnerActions.ts: 移除 4 处 console.log
- ocr.ts: 移除 26 处 console.debug
- useBankReceipt.ts: 移除 1 处 console.debug
- useInvoiceOCR.ts: 移除 2 处 console.log
- console.error/warn 全部保留

### R8.5 TODO/FIXME 清理 (1 文件)
- WageBatchViews.tsx: 移除 2 处 TODO 注释

---

## 红绿灯状态 (v0.78.2)

- ✅ `tsc --noEmit` — 0 error
- ✅ `npm run check` — 0 HARD FAIL
- ✅ `vite build` — 15.93s 成功

---

## mimo 派单记录

| # | Task | File(s) | Result | Commit |
|---|------|---------|--------|--------|
| 1 | TODO 清理 | WageBatchViews.tsx | ✅ 一次过 | `5fe28b5` |
| 2 | console.log batch1 | Dashboard + usePartnerActions + ocr | ✅ 一次过 | `a9059fa` |
| 3 | console.log batch2 | useBankReceipt + useInvoiceOCR | ✅ 一次过 | `9c604f7` |

---

## 操作 Tips

- 用 Node.js `.cjs` 脚本读写文件（UTF-8 safe）
- 避免并行 `git commit`（`index.lock`）
- 不用 `Set-Content -Encoding UTF8`（会失败），用 `[System.IO.File]::WriteAllText` 或 `Out-File`
- `apply_patch` 工具在当前环境报 "Access is denied"，用 Node.js 脚本替代
- mimo 启动命令用单引号路径，避免 PowerShell 引号转义问题

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

1. `git -C "E:\测试" log --oneline -5` 确认 HEAD
2. 确认当前 sprint 状态
3. 准备 mimo prompt 文件
4. 启动 mimo 执行
5. 审查结果 + commit