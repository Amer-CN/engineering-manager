# 版本管理与发布（SemVer + 红绿灯）

> 从根 AGENTS.md 下沉（2026-07-29）。主题：SemVer bump 规则、版本号引用位置、tag 策略、changelog 写作规范、红绿灯发布门禁。

## 🔢 版本管理 (v0.75.3 起严格执行 SemVer)

### Bump 规则

| Commit 类型 | Bump 方式 | 例 |
|------------|----------|---|
| `feat(...)` 新功能 | **minor**: 0.X.0 | v0.74.0 → v0.75.0 |
| `fix(...)` bug 修复 | **patch**: 0.X.Y | v0.75.0 → v0.75.1 |
| `perf(...)` 性能优化 | **patch**: 0.X.Y | |
| `refactor(...)` 代码重构 | **不 bump** | 版本号不变 |
| `docs(...)` / `chore(...)` | **不 bump** | 版本号不变 |

### 当前版本: v0.82.1（以 package.json 为唯一真源）

### 历史背景 (重要)

v0.74.0 → v0.85.0 (已 rebase 整理) 期间, 项目曾把 **refactor-only sprint 也当作 minor 版本 bump**, 导致 7 次 spurious `chore: bump version` commits. v0.75.3 已 `git rebase -i ce8cf23` **drop 掉这 7 个 commits**, 重组 git 历史为正确 semver (1 minor + 3 patches + 18 refactors).

### 版本号引用位置（6 处）

**自动同步**（由 `scripts/sync-version.mjs` 从 package.json 读取并写入，`npm run sync-version` 或 `build:frontend` 时自动执行）：

| 位置 | 用途 |
|------|------|
| `src/version.ts` | 前端运行时版本常量（`APP_VERSION`） |
| `EngineeringManager.Api/EngineeringManager.Api.csproj` `<Version>` | 后端程序集版本 |
| `installer/package.json` | 安装器项目版本 |
| `installer/src/App.tsx` | 安装器界面显示的版本号（`<WelcomeStep version="x.y.z" />`） |
| `src/components/Login.tsx` | 登录页版本 fallback（`__APP_VERSION__` 未注入时的兜底值；v0.93.0 起纳入脚本，避免漏更） |

**手动同步**（脚本不覆盖，bump 时必须人工改）：

| 位置 | 用途 |
|------|------|
| `AGENTS.md` 抬头 | `> 项目状态：vX.Y.Z（以 package.json 为唯一真源） · 最后同步：<日期>` |
| `src/components/AGENTS.md` 抬头 | 同上格式 |

> **注意**：`index.html` 中的 `<APP_VERSION>` 占位符由 `vite.config.ts` 在每次构建时自动从 `package.json` 读取并替换，无需手动修改。
>
> **踩过的坑**：上面两处 AGENTS.md 抬头是 `check:version` 的严格比对项，但脚本不写它们 —— 只跑 `npm run sync-version` 就去跑 `npm run check:version` 必然 exit 1。bump 的标准动作是：改 package.json → `npm run sync-version` → 手改两份 AGENTS.md 抬头 → `npm run check:version`。

### 版本一致性校验（只读门禁）

`node scripts/check-version-consistency.cjs`（`npm run check:version`，CI lint job 自动执行）以 package.json 为真源比对以下引用，不一致 exit 1 并指出文件：

| 覆盖项 | 校验规则 |
|--------|---------|
| `src/version.ts`（APP_VERSION） | 严格相等 |
| `EngineeringManager.Api/EngineeringManager.Api.csproj` `<Version>` | 严格相等 |
| `installer/package.json` | 严格相等 |
| `installer/src/App.tsx`（version prop） | 严格相等 |
| `src/components/Login.tsx`（fallback，人工同步项） | 严格相等 |
| `AGENTS.md` / `src/components/AGENTS.md`（抬头版本号） | 严格相等 |
| `update/manifest.json` `latest` | 日常允许滞后（发布产物）但不允许超前；`--release` 模式要求严格相等 |
| `CHANGELOG.md`（最新版本号） | 日常允许滞后（天然含历史版本号）但不允许超前；`--release` 模式要求严格相等 |

> `update/manifest.json` 仅在 `npm run release:manifest`（make-manifest.mjs）打包收尾时重新生成，日常滞后于 package.json 属正常状态。发布收尾请跑 `npm run check:version -- --release` 确认全链一致。改动上表任一覆盖项时，须同步修改校验脚本，反之亦然。

### 何时打 tag

- 每次 minor / patch bump 时, 打完 chore commit 后立刻 `git tag v0.X.Y`
- refactor-only sprint: **不打 tag**

## 更新日志写作规范 (v0.81.0 起)

**数据源文件**: `src/constants/changelog.ts` — 应用内「设置 → 更新日志」的唯一数据源

**发布同步**: 写完 `changelog.ts` 后, 同步内容到 GitHub Release notes (大白话描述, 与应用内一致)

| 规则 | 说明 |
|------|------|
| 语言 | 大白话, 普通人能看懂; 不写代码细节 |
| 格式 | **所有版本统一用 `groups` 分组格式** (与 GitHub Release 一致) |
| 条目写法 | `**粗体标题**：大白话描述` — 组件 `renderMarkdownInline` 自动解析粗体 |
| 分组标题 | `🐛 Bug 修复` / `✨ 体验优化` / `🚀 新功能` / `🔧 技术优化` |

**示例**:
```typescript
{ v: 'v0.82.0', date: '2026-07-05', groups: [
  { label: '🚀 新功能', items: [
    '**批量导入发票**：现在可以一次拖入多个发票文件，系统自动识别并填好',
  ] },
  { label: '🐛 Bug 修复', items: [
    '**合同金额不显示**：某些合同金额显示为 0 的问题修好了',
  ] },
] }
```

---

## 🚦 红绿灯（v0.71.0 起, v0.79.0 加 tsc）

每个 sprint 收尾 / release 前必跑，0 error 才算合格。完整流程见 [SMOKE-TEST.md](SMOKE-TEST.md)。

```bash
# 1. 后端编译
cd "E:\测试\EngineeringManager.Api" && dotnet build 2>&1 | Select-String -Pattern "错误|Build succeeded"
cd "E:\测试\EngineeringManager.Api" && dotnet build 2>&1 | Select-String -Pattern "(warning|error|生成成功|生成失败|Build)"

# 2. 后端单元测试
cd "E:\测试\EngineeringManager.Tests" && dotnet test 2>&1 | Select-String -Pattern "通过:|失败:|总计:"

# 3. 前端规则检查
cd "E:\测试" && npm run check 2>&1 | Select-String -Pattern "HARD FAIL|passed|failed"

# 3b. 版本引用一致性（发布收尾加 -- --release 严格校验 manifest）
cd "E:\测试" && npm run check:version

# 4. 前端构建
cd "E:\测试" && npx vite build 2>&1 | Select-String -Pattern "error|success|✓|✗"

# 5. TypeScript 类型检查 (v0.79.0 新增)
cd "E:\测试" && npx tsc --noEmit --pretty false 2>&1 | Select-String -Pattern "error TS"

# 6. 前端单元测试 (M-FIX1 F5 补入命令行；教训：G2 连推 9 笔前端改动没跑过一次 vitest,
#    导致 15 个 mock 契约漂移测试红到 M-FIX1 才被发现——每次提交前必跑)
cd "E:\测试" && npx vitest run 2>&1 | Select-String -Pattern "Test Files|Tests|failed"
```

**通过标准**：

- 后端 0 错误 0 警告
- 后端 tests 全部通过（测试套件位于 EngineeringManager.Tests/：Common / Endpoints / Migrations / Security）
- 前端 check 0 HARD FAIL (73 警告是历史软警告, 不影响)
- check:version passed（版本引用全链一致；tag 前用 `--release` 严格模式）
- vite build 10-18 秒成功 (依赖并行 CI, 18s 偏慢可接受)
- **tsc 0 error (v0.79.0 起, 防 unused import / 类型错乱回归)**
- 前端 vitest 全部通过（mask / useMaskedFn / api-client 等套件）

**全部项目绿才可 git tag v0.x.0**（含 check:version --release）。任何一项红 → 标记 WIP，先修。
