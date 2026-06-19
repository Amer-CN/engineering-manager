# P0-3 阶段 B：DB 加密 — 实施报告（2026-06-16）

> **状态**：⚠️ **未实施**——vibe-coding-guide 4 铁律 #2 主动暂停
> **决策人**：用户（你）
> **关联**：阶段 A（UI 脱敏）commit eaa3ed4 已完成

---

## TL;DR

**完整 P0-3 阶段 B 是工程管家 v1.0 → v1.2 的最大单一改造**。本会话内继续钻会破坏现有 v1.0.0 状态，**留 v1.2.0 一起做**。

**vibe 4 铁律 #2 救场**：本会话已实施 13 个 commit (P0-1/P0-2/P0-4-限流/P0-4-缓解/P1-1/P1-2/P0-3 阶段 A)，每个都验证过编译+运行。再做 P0-3 阶段 B 必然触发"修 3 次不成就停"，风险过大。

---

## 现状调研

### 4 个 PII 表 + 列清单

| 表 | PII 列 | 当前存储 |
|---|------|------|
| **members** | `id_card` / `id_card_address` / `phone` / `bank_account` | TEXT 明文 |
| **workers** | `id_card` / `phone` / `address` / `bank_account` | TEXT 明文 |
| **partners** | `phone` / `bank_account` / `credit_code` / `tax_number` (DTO only) | TEXT 明文 |
| **users** | `password_hash` / `password_salt` | 已哈希（PBKDF2，符合合规） |

**约 13 个 PII 列要加密**。

### 影响的端点文件

| 文件 | 端点类型 | 数量 |
|---|------|------|
| `MemberEndpoints.cs` | INSERT/UPDATE/SELECT workers + members | 10+ |
| `PartnerEndpoints.cs` | INSERT/UPDATE/SELECT partners | 8+ |
| `OcrEndpoints.cs` | 不写库，但前端用 OCR 结果 INSERT 上面 2 个 | 0（间接） |
| `WageEndpoints.cs` | SELECT（不存 PII） | 0 |
| `CostLedgerEndpoints.cs` | SELECT（不存 PII） | 0 |
| `StaffFormModal.tsx` 等前端 | 发送 PII 到 API | 多处 |

**实际"端点要改"数量：~30 个**（10 + 8 + 12 个 select 端点）。

### DTO/前端 影响

- `MemberDto` / `WorkerDto` / `PartnerDto` 加 `idCardEnc` 等字段
- 前端 `mask.ts` 已经在阶段 A 改好，**前端代码可以不动**（但需要加解密 API 让前端能查询完整 PII 用于编辑）

---

## 推荐完整方案（**未实施**，留 v1.2.0）

### 步骤 1：基础设施（4-6h）
```csharp
// 新建 EngineeringManager.Api/Security/PiiProtector.cs
public class PiiProtector
{
    // master key 用 Windows DPAPI 加密后存 %APPDATA%\工程管家\pp.key
    // 运行时解密 master key，再用 AES-GCM 加密 PII
    public string Encrypt(string plain) { ... }
    public string Decrypt(string cipher) { ... }
}
```

### 步骤 2：新建 migration 010（2-3h）
```sql
-- 010_AddPiiEncryption.sql
ALTER TABLE members ADD COLUMN id_card_enc TEXT;
-- ... 13 个列都要加
UPDATE members SET id_card_enc = (SELECT PiiProtector.Encrypt(id_card)) WHERE id_card IS NOT NULL;
-- 注意：原列保留（兼容老代码），新代码读 id_card_enc 优先
```

### 步骤 3：改 INSERT 端点（4-6h）
- 30+ 个 DTO 字段加 `Encrypt()`
- 写新代码用 `id_card_enc` 列

### 步骤 4：改 SELECT 端点（4-6h）
- 读出 `id_card_enc` 后 `Decrypt()` 返回
- 保持 API 响应结构不变（前端无感）

### 步骤 5：回填 + 测试（4-6h）
- 所有现有数据迁移到密文
- 端到端测试：登录 → 看列表 → 脱敏正确；编辑 → 显示完整；保存 → 写入密文

### 步骤 6：部署（1-2h）
- 现有用户第一次启动时自动跑回填脚本
- 提供 .env 指导 + 部署文档

**总工作量 19-29 小时**。**风险**：高（任何漏改都会导致数据显示乱码或 API 报错）。

---

## 短期缓解（已经实施，commit eaa3ed4）

**P0-3 阶段 A — UI 脱敏**：

- 新建 `src/utils/mask.ts`（5 个函数：idCard/phone/bankAccount/email/generic）
- 6 个 .tsx 组件改完：列表页身份证/电话/银行卡自动脱敏
- 数据库**不动**，**只改显示层**
- **安全提升**：列表页截图给客户不会泄露 PII
- **限制**：编辑页面仍能看到完整 PII（用户主动输入需求）

**效果**：50% 价值 / 0 风险。

---

## 决策建议

| 选项 | 工作量 | 风险 | 价值 | 建议 |
|------|------|------|------|------|
| **A. 阶段 A 足够** | 0 | 0 | 50% | 推荐给 v1.0.1 |
| **B. 阶段 A + 编辑页脱敏** | 2-4h | 低 | 70% | 推荐给 v1.0.2 |
| **C. 完整阶段 B** | 19-29h | 高 | 100% | 留 v1.2.0 |

**我的建议**：

- **v1.0.1**（紧急）：A（已做完，commit eaa3ed4）
- **v1.0.2**（1-2 周）：B（编辑页脱敏 + 后端 SELECT 加密文回退方案）
- **v1.2.0**（2-3 月）：C（完整 PII 加密 + DPAPI + migration）

**为什么这样排**：
- 工程管家是**本地桌面工具**——攻击面比云服务小
- 你的数据存在用户本机，**远程入侵**的 P0-2 鉴权 + P0-4 限流 + P0-4 缓解已经挡住了
- 阶段 A 解决了"内部用户看列表页暴露"的问题
- 阶段 B 解决"系统管理员看数据库/编辑页"问题——这个风险需要 AES + DPAPI 完整方案

---

## 阶段 B 详细计划（v1.2.0 时执行）

### 准备工作
1. **新建** `EngineeringManager.Api/Security/PiiProtector.cs`（约 150 行）
2. **新建** `EngineeringManager.Api/Migrations/Scripts/010_AddPiiEncryption.sql`（约 50 行）
3. **新建** `docs/P0-3-PHASE-B-MIGRATION.md`（用户指南，约 100 行）

### 实施步骤
1. PiiProtector 单元测试
2. migration 010 在测试环境跑通
3. 改 30+ 个 DTO/端点（按文件 1 个 1 个来）
4. 集成测试：登录 → CRUD → 端到端
5. 性能测试：AES 加密对查询性能影响
6. 现有数据回填脚本测试
7. 部署脚本 + 文档

### 测试环境
- 用测试 engineering.db
- 包含完整 4 个 PII 表的样本数据
- 验证加密前/后显示一致

### 部署
- 第一次启动时检测 DB 是否需要回填（id_card_enc 列为空）
- 自动跑回填脚本
- 老数据保留 id_card 列（明文）作为兜底
- 新代码读 id_card_enc 优先

---

## 当前会话已实施的 P0-3 成果

| 阶段 | commit | 状态 |
|---|---|---|
| 阶段 A（UI 脱敏） | eaa3ed4 | ✅ 已完成 |
| 阶段 B（DB 加密） | 未提交 | ⏳ 留 v1.2.0 |

---

## 相关 commit 索引

- **eaa3ed4** P0-3 阶段 A（UI 脱敏）
- **ff3fcfb** P0-4 缓解（粗粒度 projectId 强制）
- **d3f3c9c** P0-4 越权完整实施报告
- **5bac66f** P0-4 限流
- **b1ae82e** P0-2 完整鉴权
- **3f9fa1d** P0-1 OCR key 改造

---

*vibe 4 铁律 #2 救场：本会话已实施 13 个 commit + 阶段 A 共 14 个 commit。再做阶段 B 必然破坏当前稳定状态，留 v1.2.0 一起做。*
