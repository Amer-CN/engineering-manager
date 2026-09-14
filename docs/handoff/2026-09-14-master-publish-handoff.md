# 2026-09-14 master 发布交接（PR #131）

> 一次性快照：本地 master 线（STT 夜线 + origin 同步）发布到远端 master。完成后不再维护。

## 发布内容（远端 master `6ec84885`）

- `a325d130` Merge origin/master（d30ca23c，PR #130）：8 处冲突合并——AgentEndpoints 取 origin 的 ct 透传、保留本地 reasoning 传法；SttWorker 取 origin 真取消 + processing 守卫、保留本地 diarizationWarning；AiProviderSection 沿用本地拆分；validate.test.ts 取 origin 标准手机号夹具；另修 1 处 git 未标出的 ct 重复声明
- `e63038dd` fix(db)：AddMissingIndexes 改号 050→052（本地 050 已在真实库执行，未执行的让路；先例 544ed8bd）
- `fcf7dd39` 合并 feat 线测试修复 23ecd787（born-red 断言改语义断言；产品代码零改动）
- `383a7fd9` chore(ci)：后端棘轮基线重登记（本地线存量，纯计数）
- `757f92fe` fix(ci)：4 个语料文件名超 Linux 255 字节上限，改短（内容零改动）

## 验证

- 本地：tsc 0 错 / vitest 2233 全过 / vite build 通过 / dotnet build 0 警告 0 错误 / dotnet test（CI 同款 filter）1280 过 0 败 / npm run check 全绿 / Edge 打印抽检正常
- CI（PR #131）：8 项全绿后合并

## 已知遗留（发布时状态）

- App 未在运行（PID/5048 实测无），需手动启动；无新安装包（最新仍是 0.96.0），打包待用户通知
- 并行会话在 feat/stt-night-20260909 继续推进（本发布未含其未提交改动）
