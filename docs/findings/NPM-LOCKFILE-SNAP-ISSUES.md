# NPM-LOCKFILE-SNAP-ISSUES.md — lockfile 与快照异动取证（M-FIX11 U5）

## 背景
纪律 6 补课：M-FIX10 收尾时 package-lock.json 与 BankReceiptBatch.test.tsx.snap 出现未预期改动，
当时还原了。M-FIX11 U5 在干净的 fix/mfix11 worktree（porcelain 空）上重放，取证根因。

## 1. lockfile 非幂等（判定：非幂等，但收敛）

流程：porcelain 空 → `npm install --no-audit --no-fund`（added 551 packages）→ `git diff --stat`：

```
package-lock.json | 4 ++--
1 file changed, 2 insertions(+), 2 deletions(-)
```

diff 原文（package-lock.json 头）：
```
-  "version": "0.90.1",
+  "version": "0.91.0",
   "lockfileVersion": 3,
     "": {
       "name": "engineering-manager",
-      "version": "0.90.1",
+      "version": "0.91.0",
```

**根因**：package.json 的 version 是 0.91.0，但提交在 lock 里的 version 仍是 0.90.1（旧值，上次 bump 未同步到 lock）。
npm install 会把它纠正为 0.91.0。**无依赖增删**（lockfileVersion 不变，packages 不变），纯版本字段同步。
**判定**：非幂等——首次 install 必产生 version diff；但收敛——install 一次后 lock 与 package.json 对齐，
二次 install 不再 diff。**结论**：package-lock.json 的 version 字段是「滞后真源」，bump 时未同步。

## 2. 快照非确定性（判定：内容确定性，git 状态 M 系 mtime/索引 stat 抖动——M-FIX12 W4 订正）

流程：`npx vitest run`（181 files / 1712 tests 全过）→ `git diff --stat` 只有 package-lock；
但 `git status --porcelain` 显示 `M src/.../BankReceiptBatch.test.tsx.snap`。

**M-FIX12 W4 哈希钉死**（订正 M-FIX11 U5 的「autocrlf 行尾换算」说法）：
```
git config core.autocrlf          → true（但 check-attr text/eol 均 unspecified，无 .gitattributes 强制）
vitest 前: git hash-object = bdc5c041f4367c5d6b757e80926c3fb7c9717878
           git rev-parse HEAD:... = bdc5c041f4367c5d6b757e80926c3fb7c9717878（相同）
vitest 后: git hash-object = bdc5c041f4367c5d6b757e80926c3fb7c9717878（不变）
           git rev-parse HEAD:... = bdc5c041f4367c5d6b757e80926c3fb7c9717878（不变）
git status --porcelain            → M（但哈希相同 = 内容零变化）
```

**根因**：vitest 重写 snap 文件（写回同内容）更新 mtime → git 索引 stat 缓存失效 → 重新校验后
发现 blob 哈希未变（内容零变化）但 git 标记 M（stat 抖动后重判）。**与行尾无关**（autocrlf 只影响
checkout 时的工作树行尾，不影响 blob 内容哈希；哈希相同证明字节级一致）。
**判定**：快照**内容确定**（哈希级相同），非非确定性测试；git 状态 M 是 mtime/索引 stat 抖动。

## 3. 处置
- 只取证不提交。已 `git checkout --` 还原两文件，porcelain 为空。
- 后续任何「npm install 后 lockfile 变」或「vitest 后 snap 变」：先跑 `git hash-object` + `git rev-parse HEAD:` 对比，
  确认是 version 同步或 mtime/stat 抖动而非真实漂移（哈希变才是真漂移），再决定是否提交。
- R9 建议：bump version 时同步 package-lock.json 的 version 字段（或接受每次 install 收敛）。
