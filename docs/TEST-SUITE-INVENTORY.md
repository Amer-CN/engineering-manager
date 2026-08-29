# 测试套件盘点（工程管家）

> 生成基线：`bbddc22f` · 日期：2026-08-22
> 数据源：`EngineeringManager.Tests/`（86 个测试文件，不含 obj/）

## 目录

1. [测试项目结构](#测试项目结构)
2. [测试基类与基础设施](#测试基类与基础设施)
3. [端点测试（60 个）](#端点测试60-个)
4. [安全测试（9 个）](#安全测试9-个)
5. [迁移测试（7 个）](#迁移测试7-个)
6. [服务测试（2 个）](#服务测试2-个)
7. [测试覆盖矩阵](#测试覆盖矩阵)

---

## 测试项目结构

```
EngineeringManager.Tests/
├── Common/          # 测试基类与基础设施（4 个）
├── Endpoints/        # 端点测试（60 个）
├── Migrations/       # 迁移测试（7 个）
├── Security/         # 安全测试（9 个）
└── Services/         # 服务测试（2 个）
```

**总计 86 个测试文件**（排除 obj/ 编译产物）。

---

## 测试基类与基础设施

| 文件 | 说明 |
|------|------|
| `Common/ApiTestBase.cs` | API 测试基类：启动 TestServer、注入测试数据库、JWT 模拟 |
| `Common/AgentIntegrationTestBase.cs` | Agent 集成测试基类：注入 FakeLlmChatService |
| `Common/FakeLlmChatService.cs` | LLM 聊天服务 Mock（不调真实 API） |
| `Common/TestStartup.cs` | 测试启动配置（替换限流/数据库等） |

---

## 端点测试（60 个）

### 权限门禁测试（WritePermission 系列，12 个）

按模块逐一验证 C-4 权限码门禁：

| 文件 | 模块 | 覆盖 |
|------|------|------|
| `WritePermissionTests.cs` | 通用 | 基础权限框架 |
| `WritePermissionB1Tests.cs` | B1 系统 | settings:update / 快照/备份/模板 |
| `WritePermissionB2Tests.cs` | B2 工资 | wages:create/update/delete |
| `WritePermissionB3Tests.cs` | B3 合同 | contracts:create/update/delete |
| `WritePermissionB4Tests.cs` | B4 发票 | invoices:create/update/delete |
| `WritePermissionB5Tests.cs` | B5 人事 | members:create/update/delete |
| `WritePermissionB6Tests.cs` | B6 合作方 | partners:create/update/delete |
| `WritePermissionB7Tests.cs` | B7 项目 | projects:create/update/delete |
| `WritePermissionB8Tests.cs` | B8 库存/图纸 | inventory/drawings |
| `WritePermissionB9Tests.cs` | B9 成本台账 | costLedger |
| `WritePermissionT1Tests.cs` | T1 破坏性 | settings:update 破坏性端点 |

### R9 跨人编辑测试（16 个）

验证 RowWriteGate 行级归属裁决 + 授权项目内跨人编辑 + audit fail-closed：

| 文件 | 测试对象 |
|------|---------|
| `R9AdminGatePinTests.cs` | admin 门禁钉住 |
| `R9AgreementCrossUserEditTests.cs` | 协议合同跨人编辑 |
| `R9AttendanceCrossUserEditTests.cs` | 考勤跨人编辑 |
| `R9AttendanceImportAuthzTests.cs` | 考勤导入授权 |
| `R9CategoryGateTests.cs` | 分类门禁 |
| `R9CreatePathProjectGateTests.cs` | 创建路径项目门 |
| `R9ExpenseContractCrossUserEditTests.cs` | 支出合同跨人编辑 |
| `R9IncomeContractCrossUserEditTests.cs` | 收入合同跨人编辑 |
| `R9InvoiceCrossUserEditTests.cs` | 发票跨人编辑 |
| `R9PaymentRecordCrossUserEditTests.cs` | 收付款跨人编辑 |
| `R9RegionWriteGateTests.cs` | 区域写门禁 |
| `R9SettlementCrossUserEditTests.cs` | 结算跨人编辑 |
| `R9SettlementProcessUnarchivePinTests.cs` | 结算处理/归档钉住 |
| `R9WageBatchCrossUserTests.cs` | 工资批量跨人 |
| `R9WageCreateGateTests.cs` | 工资创建门 |
| `R9WageCrossUserEditTests.cs` | 工资跨人编辑 |
| `R9WageGenerateAuthzTests.cs` | 工资生成授权 |
| `R9WorkerTeamGuardTests.cs` | 班组守卫 |

### 知识库测试（7 个）

| 文件 | 说明 |
|------|------|
| `AgentKnowledgeToolTests.cs` | Agent 知识库工具 |
| `BgeEmbeddingServiceTests.cs` | BGE 嵌入服务 |
| `KnowledgeBaseM2Tests.cs` | M2 知识库入库/检索 |
| `KnowledgeBaseServiceTests.cs` | 知识库服务 |
| `M2FourthRoundTests.cs` | M2 第四轮测试 |
| `M4SttUploadAndIngestTests.cs` | STT 上传与入库 |
| `M4ThirdRoundTests.cs` | M4 第三轮 |

### 修复回归测试（7 个）

| 文件 | 说明 |
|------|------|
| `MFix1RedTests.cs` | M-FIX1 红测试（数据范围过滤越权） |
| `MFix1F6Tests.cs` | M-FIX1 F6 金额取整修正 |
| `MFix2RedTests.cs` | M-FIX2 红测试 |
| `MFix8G58Tests.cs` | M-FIX8 文件夹权限 G58 |
| `MFix10BreakChainTests.cs` | M-FIX10 链断裂 |
| `ReviewFixRegressionTests.cs` | 审查修复回归 |
| `PiiLeakTests.cs` | PII 泄露测试 |

### 工资/考勤测试（5 个）

| 文件 | 说明 |
|------|------|
| `WageAttendanceGenerateTests.cs` | 工资考勤生成 |
| `WageBatchSaveTests.cs` | 工资批量保存 |
| `WageGenerateTests.cs` | 工资生成 |
| `ReceiptMatchTests.cs` | 回单匹配 |
| `DataScopeTests.cs` | 数据范围 |

### 认证/安全端点测试（5 个）

| 文件 | 说明 |
|------|------|
| `AuthEndpointsTests.cs` | 认证端点 |
| `ChangePasswordTests.cs` | 修改密码 |
| `CommonTests.cs` | 通用测试 |
| `OcrEndpointsTests.cs` | OCR 端点 |
| `SttEndpointsTests.cs` | STT 端点 |

### STT E2E 测试（2 个）

| 文件 | 说明 |
|------|------|
| `SttE2ETests.cs` | STT 端到端 |
| `SttEndpointsTests.cs` | STT 端点 |

### 其他端点测试（6 个）

| 文件 | 说明 |
|------|------|
| `UserDimFilterTests.cs` | 用户维度过滤 |
| `UserDimPhase2Tests.cs` | 用户维度 Phase 2 |
| `SafeQueryValidatorTests.cs` | SafeQuery 验证器 |
| `UpdateServiceTests.cs` | 更新服务 |
| `LlmProviderServiceTests.cs` | LLM 提供商 |
| `G2EnvIsolatedCollection.cs` | G2 环境隔离集合 |

---

## 安全测试（9 个）

| 文件 | 说明 |
|------|------|
| `Security/PiiProtectorTests.cs` | PII 加密/解密/密钥轮换 |
| `Security/PiiReencryptWorkerTests.cs` | PII 重加密 worker |
| `Security/SttSafetyCheckerTests.cs` | STT 安全检查器 |
| `Security/SttSafetyChecker10_12Tests.cs` | STT 安全 10/12 测试 |
| `Security/SttMutexGuardTests.cs` | STT 互斥锁 |
| `Security/SttBugRegressionTests.cs` | STT Bug 回归 |
| `Security/GpuLogParserTests.cs` | GPU 日志解析 |
| `Security/StdoutEncodingDecoderTests.cs` | stdout 编码解码 |
| `Security/LogFileReaderTests.cs` | 日志文件读取 |

---

## 迁移测试（7 个）

| 文件 | 说明 |
|------|------|
| `Migrations/CloudSyncSchemaTests.cs` | 云同步 schema |
| `Migrations/CloudSyncEndpointTests.cs` | 云同步端点 |
| `Migrations/Fts5TrigramTests.cs` | FTS5 trigram 索引 |
| `Migrations/KnowledgeFoldersMigrationTests.cs` | 知识库文件夹迁移 |
| `Migrations/NormalizeFinanceRoleMigrationTests.cs` | finance→accountant 迁移 |
| `Migrations/NormalizeFinanceRoleIntegrationTests.cs` | finance→accountant 集成 |
| `Migrations/AppendKnowledgeVoiceCodesMigrationTests.cs` | 知识/语音权限码追加 |

---

## 服务测试（2 个）

| 文件 | 说明 |
|------|------|
| `Services/ReportGenerationServiceFilterTests.cs` | 报告生成服务过滤 |
| `Services/WritingSkillServiceTests.cs` | 写作技能服务 |

---

## 测试覆盖矩阵

### 按模块

| 模块 | 测试文件数 | 覆盖维度 |
|------|-----------|---------|
| 权限门禁（B1-B9/T1） | 12 | 功能权限码 CRUD |
| R9 跨人编辑 | 16 | RowWriteGate + audit |
| 知识库 | 7 | 入库/检索/文件夹/实体 |
| 安全 | 9 | PII/STT 安全/编码 |
| 工资/考勤 | 5 | 生成/批量/回单匹配 |
| 认证 | 3 | 登录/改密/通用 |
| 迁移 | 7 | schema/角色/权限码 |
| 修复回归 | 7 | MFix/审查/PII 泄露 |
| STT | 4 | 端点/E2E |
| 其他 | 8 | 数据范围/SQL安全/更新/LLM |

### 按测试类型

| 类型 | 说明 |
|------|------|
| 单元测试 | SafeQueryValidator / PiiProtector / GpuLogParser 等 |
| 集成测试 | ApiTestBase 启动 TestServer + 测试数据库 |
| E2E 测试 | SttE2ETests（完整音频→转写→入库链路） |
| 红测试 | MFix1Red / MFix2Red（先写失败测试再修复） |
| 回归测试 | SttBugRegression / ReviewFixRegression |

---

*文档结束。*
