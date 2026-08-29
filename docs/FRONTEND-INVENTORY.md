# 前端架构盘点（工程管家）

> 生成基线：`bbddc22f` · 日期：2026-08-22
> 数据源：`src/services/`、`src/hooks/`、`src/utils/`

## 目录

1. [API 客户端层](#api-客户端层)
2. [API 桥接层（tauri-bridge）](#api-桥接层tauri-bridge)
3. [React Hooks 层](#react-hooks-层)
4. [PII 脱敏工具](#pii-脱敏工具)
5. [格式化工具](#格式化工具)
6. [OCR 服务层](#ocr-服务层)
7. [专项客户端](#专项客户端)

---

## API 客户端层

### api-client.ts

HTTP fetch 封装，替代 Tauri invoke 和 Electron ipcRenderer。

#### 核心设计

- **API_BASE**：同源相对路径（生产/桌面端前后端同端口，WebView2 加载本地 dist；dev 由 Vite 代理）
- **TOKEN 存储**：`localStorage` key `jwt_token`，401 时自动清除
- **PII toggle**：`localStorage` key `v120_mask_enabled`，PII 端点 + toggle=false 时自动追加 `unmask=true` 查询参数

#### HTTP 方法

| 方法 | 说明 |
|------|------|
| `get<T>(path, params?)` | GET 请求，query 参数自动拼接 |
| `post<T>(path, body?)` | POST 请求，JSON body |
| `put<T>(path, body?)` | PUT 请求 |
| `patch<T>(path, body?)` | PATCH 请求 |
| `del<T>(path)` | DELETE 请求 |

#### 统一响应格式

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

#### snake_case → camelCase 自动转换

`convertKeysToCamelCase(obj)` 递归将后端返回的 snake_case 字段名转为前端 camelCase：
- `shouldConvert(key)`：包含下划线且不以 `custom_` 开头的 key 才转换
- 跳过 Date 对象
- 递归处理数组和嵌套对象

#### PII 端点列表

```typescript
const PII_PATHS = ['/api/members', '/api/workers', '/api/partners', '/api/project-members'];
```

`isPiiPath(path)` 精确匹配 + 集合判断，避免 `/api/members/123` 也误判。

#### 认证头

`authHeaders()` 自动注入 `Authorization: Bearer <token>`，401 响应自动清除 token。

---

## API 桥接层（tauri-bridge）

### tauri-bridge.ts

导出 `tauriAPI` 对象，是前端所有业务调用的统一入口。封装了 `apiClient` 的 HTTP 调用，保持与 Electron/Tauri 版本兼容的接口。

#### 模块划分

| 模块 | 方法数 | 说明 |
|------|--------|------|
| 系统/窗口控制 | ~10 | WebView2 消息通信（minimize/maximize/close/fullscreen/drag/devtools） |
| 认证 | 4 | login / changeOwnPassword / setSession / clearSession |
| 用户管理 | 5 | CRUD + 项目授权 |
| 项目授权 | 3 | GET list / POST 授权 / DELETE 撤销 |
| 用户偏好 | 2 | GET / PUT |
| 仪表盘 | 1 | getDashboardStats |
| 项目 | 4 | CRUD |
| 成员 | 4 | CRUD |
| 工人/项目工人 | 9 | CRUD + 批量 + stats |
| 合作伙伴 | 4 | CRUD |
| 发票 | 5 | CRUD + 状态切换 |
| 合同 | ~18 | 收入/支出/协议合同 CRUD + 统计 + 模板 |
| 结算 | 6 | CRUD + process + unarchive |
| 成本台账 | ~18 | 条目/分类/批次/匹配规则/电子表格 CRUD |
| 考勤 | 8 | CRUD + 批量 + 生成 + 导入 |
| 工资 | ~16 | CRUD + 批量 + 付款 + 回单匹配 + 归档 + 生成 |
| 薪资历史 | 6 | 历史/生效薪资/班组工资 |
| 审计日志 | 2 | auditLog / queryAuditLogs |
| 角色权限 | 3 | getRoles / updateRole / resetRole |
| 部门 | 3 | CRUD |
| 模板 | 4 | CRUD + stats |
| 快照 | 5 | CRUD + restore + max-count |
| 监管单位 | 4 | CRUD |
| 项目成员 | 3 | add / remove / update |
| 班组 | 3 | CRUD |
| 图纸 | 4 | upload / update / delete / list |
| 库存/物料 | 7 | CRUD + 交易 |
| 配置 | 4 | getConfig / setDataPath / GPU |
| 个人资料 | 2 | get / update |
| PII 密钥 | 4 | keys / rotate / reencrypt / status |
| 数据健康 | 2 | consistency / integrity |
| SQLite | 3 | status / migrate / read-mode |
| OCR | ~12 | 各类 OCR + 统计 + token 缓存 |
| 文件操作 | 5 | save / read / delete / open-external / parseBankReceipt |
| 合同文件 | 2 | read / save |

#### 批量回单解析

`batchParseBankReceipts(filePaths, projectId?, yearMonth?)`：
- 并发上限 3，逐文件错误隔离（单张失败 → failedFiles，不拖死整批）
- 保持输入顺序
- 读取已保存的回单文件 → 百度银行回单 OCR → 解析结果

---

## React Hooks 层

### useCRUDBase

**文件**：`useCRUDBase.ts`

通用 CRUD Hook 工厂，为所有业务模块提供统一的数据操作接口。

```typescript
function useCRUDBase<T extends { id: number }, CreateDTO, UpdateDTO>(
  options: UseCRUDBaseOptions<T, CreateDTO, UpdateDTO>
): UseCRUDBaseReturn<T, CreateDTO, UpdateDTO>
```

#### 返回值

| 字段 | 类型 | 说明 |
|------|------|------|
| `data` | `T[]` | 当前数据列表 |
| `loading` | `boolean` | 加载状态 |
| `error` | `string \| null` | 错误信息 |
| `selectedItem` | `T \| null` | 当前选中项 |
| `loadData` | `() => Promise<void>` | 加载数据 |
| `create` | `(dto: CreateDTO) => Promise<boolean>` | 创建 |
| `update` | `(dto: UpdateDTO) => Promise<boolean>` | 更新 |
| `delete` | `(id: number) => Promise<boolean>` | 删除 |
| `setSelectedItem` | `(item: T \| null) => void` | 设置选中项 |
| `clearError` | `() => void` | 清除错误 |
| `refresh` | `() => Promise<void>` | 刷新 |
| `setData` / `updateData` | 函数 | 直接操作数据 |

#### createCRUDHook 工厂

```typescript
function createCRUDHook<T, CreateDTO, UpdateDTO>(
  api: CRUDAPI<T, CreateDTO, UpdateDTO>,
  errorPrefix: string,
  autoLoad: boolean
)
```

用于快速创建模块专用 Hook（如 `useProjects`、`useMembers` 等）。

#### 子模块

- `useCRUDBase.loaders.ts`：数据加载逻辑
- `useCRUDBase.actions.ts`：CRUD 操作逻辑
- `useCRUDBase.types.ts`：类型定义

### useAuth

认证状态管理 Hook，从 Zustand store 重新导出：
```typescript
export { useAuth, useAuthStore, type StoredAuth } from '@/store/authStore'
```

**安全设计**：每次打开应用都需要重新登录，不自动恢复登录状态。

### data/ 目录 hooks（React Query 数据层）

| Hook | 对应 API |
|------|---------|
| `useProjects` | `/api/projects` |
| `useMembers` | `/api/members` |
| `useWorkers` | `/api/workers` |
| `usePartners` | `/api/partners` |
| `useInvoices` | `/api/invoices` |
| `useContracts` | `/api/contracts/*` |
| `useSettlements` | `/api/settlements` |
| `useCostLedger` | `/api/cost-ledger/*` |
| `useDepartments` | `/api/departments` |
| `useTemplates` | `/api/templates` |
| `useKnowledgeDocuments` | `/api/knowledge/documents` |
| `useKnowledgeFolders` | `/api/knowledge/folders` |

### 业务 hooks（部分）

| Hook | 说明 |
|------|------|
| `useAuth` | 认证状态 |
| `useConfirm` | 确认对话框 |
| `useAsync` | 异步操作 |
| `useDebounce` / `useDebouncedCallback` | 防抖 |
| `useFileUpload` | 文件上传 |
| `useDataTableFilters` / `useDataTableState` | 表格筛选/状态 |
| `useAuditLogFilters` | 审计日志筛选 |
| `useDataPath` | 数据路径 |
| `useCostLedgerBatches` / `useCostLedgerCategories` | 成本台账子模块 |
| `useBankCardOCR` / `useBankReceiptOCR` / `useBankStatementOCR` / `useBusinessLicenseOCR` / `useCompanyQueryOCR` | OCR hooks |
| `useBankReceiptBatch` | 批量回单处理 |
| `usePermission` | 权限检查 |

---

## PII 脱敏工具

### mask.ts

UI 层 PII 脱敏（不修改数据库，只改显示层）：

| 函数 | 规则 | 示例 |
|------|------|------|
| `maskIdCard(value)` | 前 4 + `*` + 后 4 | `110101********1234` |
| `maskPhone(value)` | 前 3 + `****` + 后 4 | `138****5678` |
| `maskBankAccount(value)` | 前 4 + `*` + 后 4 | `6222****5678` |
| `maskEmail(value)` | 首字符 + `***` + @域名 | `a***@example.com` |
| `maskPII(type, value)` | 通用入口（自动识别类型） | — |

**短值保护**：长度不足时原样返回（身份证 <8 位、手机 <7 位、银行卡 <8 位）。

---

## 格式化工具

### format.ts

| 函数 | 说明 | 示例 |
|------|------|------|
| `formatMoney(amount, decimals=2)` | 千分位 + 去尾零 | `1234.5` → `"1,234.5"` |
| `parseMoney(str)` | 移除千分位 | `"1,234.5"` → `1234.5` |
| `formatPercent(value, decimals=2)` | 百分比 | `0.1234` → `"12.34%"` |
| `truncate(str, maxLength)` | 截断 + `...` | — |
| `capitalize(str)` | 首字母大写 | — |
| `kebabCase(str)` | 驼峰转短横线 | — |
| `camelCase(str)` | 短横线转驼峰 | — |
| `generateId()` | 随机 ID | `${timestamp}-${random}` |
| `copyToClipboard(text)` | 复制到剪贴板 | — |
| `downloadFile(content, filename, mimeType?)` | 下载文件 | — |

---

## OCR 服务层

### services/ocr/

| 文件 | 说明 |
|------|------|
| `idCard.ts` | 身份证 OCR |
| `invoice.ts` | 发票 OCR |
| `bankCard.ts` | 银行卡 OCR |
| `businessLicense.ts` | 营业执照 OCR |
| `bankReceipt.ts` | 银行回单 OCR |
| `bankStatement.ts` | 银行流水 OCR |
| `permit.ts` | 开户许可证 OCR |
| `generalReceipt.ts` | 通用票据 OCR |
| `companyQuery.ts` | 企业工商信息查询 |
| `config.ts` | OCR 配置 |
| `types.ts` | 类型定义 |
| `utils.ts` | 工具函数 |
| `index.ts` | 统一导出 |

每个 OCR 服务函数接收 `imageBase64` 参数，调用对应后端端点返回结构化结果。

---

## 专项客户端

### services/

| 文件 | 说明 |
|------|------|
| `agent-client.ts` | Agent AI 对话客户端（SSE 流式） |
| `knowledge-client.ts` | 知识库检索客户端 |
| `knowledge-folders.ts` | 知识库文件夹客户端 |
| `stt-client.ts` | 语音转写客户端 |
| `writing-client.ts` | 写作中心客户端（SSE 流式） |
| `report-client.ts` | 报告生成客户端 |
| `update-client.ts` | 更新管理客户端（SSE 进度） |
| `companyQuery.ts` | 企业查询客户端 |
| `fileService.ts` | 文件服务 |

---

## 数据流总结

```
前端组件
  ↓ 调用
tauriAPI (tauri-bridge.ts) — 统一 API 入口
  ↓ 调用
apiClient (api-client.ts) — HTTP fetch 封装
  ↓ HTTP
ASP.NET Core Minimal API (localhost:5048)
  ↓ Dapper
SQLite (engineering.db)
```

**数据转换**：
- 请求：前端 camelCase → JSON → 后端接收
- 响应：后端 snake_case → JSON → 前端 `convertKeysToCamelCase` → camelCase

**认证流**：
1. 登录 → JWT 存入 localStorage
2. 每次请求 → `authHeaders()` 注入 Bearer token
3. 401 → 自动清除 token
4. 权限 → `usePermission` hook + 后端 `HasPermission` 双重校验

---

*文档结束。*
