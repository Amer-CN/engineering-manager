# MIGRATION-NUMBERING-DEFECT.md — 迁移号冲突与排序（M-FIX7 U3）

## 事实
- MigrationRunner.cs:32-34 `OrderBy(n => n)` = **按资源名字符串排序**（非数字）。
- 仓库已有 011_ 双份、032_ 双份、007b_ 三处「同号不同名」异常。
- M 窗口 PR #9 占用 039/040/041（AddKnowledgeFolders/AddKnowledgeDocumentsSoftDelete/AppendKnowledgeVoiceCodes）。

## 排序影响
- **字符串排序下同号不同名不冲突**：`011_A.sql` 与 `011_B.sql` 都按字母序执行，各跑一次（只要不都改同一列）。
- `007b_` 字符串序在 `007_` 与 `008_` 之间：若 007b 与 007 改同一列 → 后者「duplicate column」被 MigrationRunner 良性吞掉（幂等）。
- **风险**：若两个同号脚本都「CREATE TABLE IF NOT EXISTS 同名表」且结构不同 → 第二个静默跳过 → 结构偏差。当前无此案例（011/032 是 ADD COLUMN 类幂等）。

## 结论
- 「同号不同名」在 MigrationRunner 字符串排序下**不会漏跑或跑两次**（各按序执行一次），但**依赖脚本自身幂等**（良性错误吞掉）。
- 根治方向（R9 建议）：改数字显式排序（解析 NNN 前缀按数字排），杜绝字符串序陷阱；或加「同号不同名」门禁（check-migration-naming 已存在但只查命名格式）。
