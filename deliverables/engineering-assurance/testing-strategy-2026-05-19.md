# 测试策略文档

**项目**：工程管家 v2.12.0  
**版本**：Electron + React + TypeScript + Vite  
**日期**：2026-05-19  
**作者**：测试专家（Tessa）

---

## 一、当前测试覆盖现状

### 1.1 测试基础设施评估

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 测试框架 | ❌ 无 | package.json 中无 vitest/jest 依赖 |
| 测试脚本 | ❌ 无 | 无 `test` npm script |
| 测试文件 | ❌ 无 | 项目中不存在 `*.test.ts` 或 `*.spec.ts` |
| 覆盖率报告 | ❌ 无 | 无任何覆盖率工具 |
| Git Hooks | ❌ 无 | 无 husky/lint-staged |

**结论**：项目当前处于 **零测试基础设施** 状态。

### 1.2 项目规模统计

| 类别 | 文件数 | 预估代码行数 |
|------|--------|--------------|
| Electron Main 进程 | 12 | ~2,500 |
| IPC Handlers | 28 | ~8,000 |
| React 组件 | 45+ | ~15,000 |
| Hooks | 35 | ~5,000 |
| Utils | 10 | ~2,000 |
| Services | 3 | ~1,500 |

---

## 二、推荐测试框架

### 2.1 框架选择：**Vitest**

**推荐理由**：
1. **Vite 原生集成**：已有 vite 5.x 环境，vitest 无缝集成
2. **高性能**：基于 Vite 的即时 HMR，测试运行速度快
3. **TypeScript 支持**：开箱即用，无需额外配置
4. **与 Jest 兼容**：Jest 风格的 API，团队迁移成本低
5. **ESM 支持**：完美支持 ES Modules

### 2.2 安装依赖

```bash
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
```

### 2.3 配置文件创建

创建 `vitest.config.ts`：

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

创建 `src/test/setup.ts`：

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Electron API
vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  },
}))

// Mock window.electronAPI
global.window.electronAPI = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock
```

---

## 三、测试类型优先级

### 3.1 优先级矩阵

```
        ┌─────────────────────────────────────────┐
        │         测试金字塔                       │
        │                                         │
        │              ┌───────────┐              │
        │              │   E2E     │  ← P2 少量   │
        │             ┌┴───────────┴┐             │
        │             │  集成测试   │  ← P1 适量  │
        │            ┌┴─────────────┴┐            │
        │            │   单元测试   │  ← P0 大量  │
        │            └───────────────┘            │
        └─────────────────────────────────────────┘
```

### 3.2 P0 - 单元测试（立即执行）

**目标**：Electron IPC Handlers + 核心业务逻辑

| 模块 | 测试文件 | 测试用例数 |
|------|----------|------------|
| `electron/database.ts` | `electron/database.test.ts` | 8-10 |
| `electron/ipc-handlers/cost-ledger.ts` | `electron/cost-ledger.test.ts` | 12-15 |
| `electron/ipc-handlers/wage-calc.ts` | `electron/wage-calc.test.ts` | 10-12 |
| `src/services/ocr.ts` | `src/services/ocr.test.ts` | 6-8 |
| `src/utils/audit.ts` | `src/utils/audit.test.ts` | 8-10 |

**初始目标**：≥30 个测试用例

### 3.3 P1 - 集成测试（后续阶段）

**目标**：Utils、Service、Hook 级别的集成测试

| 模块 | 测试文件 | 测试用例数 |
|------|----------|------------|
| `src/utils/date.ts` | `src/utils/date.test.ts` | 5-8 |
| `src/utils/format.ts` | `src/utils/format.test.ts` | 5-8 |
| `src/hooks/useCRUDBase.ts` | `src/hooks/useCRUDBase.test.ts` | 8-10 |
| `src/hooks/useAsync.ts` | `src/hooks/useAsync.test.ts` | 6-8 |

### 3.4 P2 - 组件测试（Phase 4 后）

**目标**：关键 React 组件交互测试

| 组件 | 测试文件 | 测试用例数 |
|------|----------|------------|
| `CostLedgerImportModal` | `CostLedgerImportModal.test.tsx` | 10-15 |
| `DropdownMenu` | `DropdownMenu.test.tsx` | 5-8 |
| `DataTable` | `DataTable.test.tsx` | 8-10 |

---

## 四、高价值测试点识别

### 4.1 `electron/database.ts` - 核心数据层

**关键函数测试用例**：

| 函数 | 测试用例 | 预期行为 |
|------|----------|----------|
| `hashPassword()` | 密码哈希一致性 | 相同输入产生相同哈希 |
| `hashPassword()` | 不同盐值不同哈希 | 相同密码+不同盐值产生不同哈希 |
| `verifyPassword()` | 正确密码验证通过 | 返回 true |
| `verifyPassword()` | 错误密码验证失败 | 返回 false |
| `createSnapshot()` | 快照创建成功 | 返回 SnapshotInfo |
| `createSnapshot()` | 数据库不存在时返回 null | 不抛出异常 |
| `restoreSnapshot()` | 快照恢复成功 | 数据库内容还原 |
| `restoreSnapshot()` | 快照不存在 | 返回 false |
| `cleanOldSnapshots()` | 保留最新快照 | 删除旧快照 |
| `saveDatabase()` | 原子写入 | temp file + rename |

### 4.2 `electron/ipc-handlers/cost-ledger.ts` - 成本台账业务

**关键场景测试用例**：

| 场景 | 测试用例 | 预期行为 |
|------|----------|----------|
| 批次创建 | 创建新批次 | 返回新批次数据，ID 递增 |
| 批次删除 | 删除非初始版本 | 返回成功 |
| 批次删除 | 删除初始版本 (id=0) | 返回错误 |
| 批次复制 | 复制源版本数据 | 新批次包含源数据副本 |
| 批量导入 | 导入去重 | 相同凭证号不重复创建 |
| 分类创建 | 创建重复分类 | 返回错误 |
| 分类删除 | 删除被引用的分类 | 返回引用计数警告 |
| 发票状态 | 关联发票存在 | linkedInvoiceStatus='active' |
| 发票状态 | 关联发票已删除 | linkedInvoiceStatus='deleted' |

### 4.3 `electron/ipc-handlers/wage-calc.ts` - 工资计算

**关键函数测试用例**：

| 函数/场景 | 测试用例 | 预期行为 |
|-----------|----------|----------|
| `getDaysInMonth()` | 常规月份 | 返回正确天数 |
| `getDaysInMonth()` | 闰年2月 | 返回29 |
| `getDaysInMonth()` | 非闰年2月 | 返回28 |
| `calculateActualWage()` | 正常计算 | (日薪×天数+奖金-扣款) |
| `calculateActualWage()` | 负数处理 | 返回负数（不报错） |
| `generateProjectWages()` | 归档记录保留 | 已归档记录不被覆盖 |
| `generateProjectWages()` | 无考勤跳过 | 不生成工资记录 |
| `parseBankReceiptText()` | 标准格式解析 | 提取日期/金额/明细 |
| `parseBankReceiptText()` | 无账号格式 | 正确解析简单格式 |

### 4.4 `src/services/ocr.ts` - OCR 服务

**关键场景测试用例**：

| 场景 | 测试用例 | 预期行为 |
|------|----------|----------|
| Provider 选择 | 离线模式 | 直接调用 offlineOCR |
| Provider 选择 | 在线+离线失败 | 回退到离线 OCR |
| Provider 选择 | 百度成功 | 返回百度结果 |
| `checkNetwork()` | 在线 | 返回 true |
| `checkNetwork()` | 离线 | 返回 false |
| `parseIdCard()` | 标准身份证 | 正确解析性别/生日 |
| `parseIdCard()` | 异常格式 | 返回空对象 |
| 配置验证 | 缺少 API Key | 返回配置错误 |

### 4.5 `src/utils/audit.ts` - 审计日志

**关键函数测试用例**：

| 函数 | 测试用例 | 预期行为 |
|------|----------|----------|
| `logAudit()` | 基本日志记录 | 创建带 ID 的日志 |
| `logAudit()` | 带 details | details 被保存 |
| `logCreate()` | 创建日志 | action='create' |
| `logDelete()` | 删除日志 | level='warning' |
| `queryAuditLogs()` | 日期范围过滤 | 只返回范围内日志 |
| `queryAuditLogs()` | 关键词搜索 | 搜索 description/username |
| `queryAuditLogs()` | 分页 | 返回正确的 page/totalPages |
| `getAuditStats()` | 近N天统计 | 只统计指定天数内 |
| `getAuditStats()` | topUsers 排序 | 按操作次数降序 |

---

## 五、Mock 策略

### 5.1 Mock 层级

```
┌─────────────────────────────────────────────┐
│           Mock window.electronAPI           │  ← Renderer 测试
├─────────────────────────────────────────────┤
│           Mock electron/* 模块              │  ← Main 进程测试
├─────────────────────────────────────────────┤
│              Mock fs/path                   │  ← 文件系统测试
├─────────────────────────────────────────────┤
│              Mock crypto                     │  ← 密码测试
└─────────────────────────────────────────────┘
```

### 5.2 Electron Main 进程测试 Mock

```typescript
// electron/test-utils.ts
import { vi } from 'vitest'

// Mock fs module
export const mockFs = {
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  copyFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  renameSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
}

vi.mock('fs', () => mockFs)

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))
```

### 5.3 Renderer 进程测试 Mock

```typescript
// src/test/mocks/electron.ts
export const mockElectronAPI = {
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}

export const mockWindow = {
  electronAPI: mockElectronAPI,
}

// 在 setup.ts 中
Object.defineProperty(global, 'window', {
  value: mockWindow,
  writable: true,
})
```

### 5.4 数据库 Mock

```typescript
// electron/database.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hashPassword, verifyPassword } from '../database'

// Mock fs before importing database
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
}))

describe('hashPassword', () => {
  it('生成一致的哈希值', () => {
    const salt = 'test-salt-123'
    const result1 = hashPassword('password123', salt)
    const result2 = hashPassword('password123', salt)
    expect(result1.hash).toBe(result2.hash)
  })

  it('不同盐值产生不同哈希', () => {
    const result1 = hashPassword('password123', 'salt1')
    const result2 = hashPassword('password123', 'salt2')
    expect(result1.hash).not.toBe(result2.hash)
  })
})
```

---

## 六、覆盖率目标

### 6.1 阶段性目标

| 阶段 | 时间 | 覆盖率目标 | 测试数 |
|------|------|------------|--------|
| Phase 0 | 当前 | - | 建立基础设施 |
| Phase 1 | +1周 | electron/ ≥20% | ≥30 |
| Phase 2 | +2周 | electron/ ≥40%, src/utils ≥50% | ≥60 |
| Phase 3 | +3周 | electron/ ≥50%, src/ ≥30% | ≥100 |

### 6.2 关键路径覆盖要求

- ✅ `hashPassword()` / `verifyPassword()` 100%
- ✅ `saveDatabase()` 原子写入路径
- ✅ `createSnapshot()` / `restoreSnapshot()` 核心路径
- ✅ 成本台账批次 CRUD 100%
- ✅ 工资计算边界条件 ≥80%
- ✅ OCR Provider 降级逻辑 100%
- ✅ 审计日志查询过滤 100%

### 6.3 覆盖率报告配置

```typescript
// vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  reportsDirectory: './coverage',
  thresholds: {
    functions: 20,
    branches: 15,
    lines: 20,
    files: 30,
  },
}
```

---

## 七、CI/CD 集成建议

### 7.1 package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:changed": "vitest --changed",
    "test:ci": "vitest run --reporter=junit --outputFile=./coverage/junit.xml"
  }
}
```

### 7.2 GitHub Actions / CI 配置

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
          thresholds: '20%'
```

### 7.3 Git Hooks (Husky)

```bash
# 安装
npm install -D husky lint-staged
npx husky install

# 添加 pre-commit hook
npx husky add .husky/pre-commit "npx lint-staged"
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "vitest related --run",
      "git add"
    ]
  }
}
```

### 7.4 VS Code 配置

创建 `.vscode/settings.json`：

```json
{
  "vitest.workspace": ["./"],
  "vitest.enable": true
}
```

---

## 八、测试文件结构

```
E:/测试/
├── electron/
│   ├── database.test.ts          # 数据库模块测试
│   ├── ipc-handlers/
│   │   ├── cost-ledger.test.ts  # 成本台账测试
│   │   └── wage-calc.test.ts     # 工资计算测试
│   └── test-utils/
│       ├── mocks.ts             # Mock 工具
│       └── helpers.ts           # 测试辅助函数
├── src/
│   ├── test/
│   │   ├── setup.ts              # 测试环境配置
│   │   ├── mocks/
│   │   │   ├── electron.ts       # Electron API Mock
│   │   │   └── localStorage.ts   # Storage Mock
│   │   └── utils/
│   │       └── render.tsx        # 测试渲染工具
│   ├── services/
│   │   └── ocr.test.ts          # OCR 服务测试
│   ├── utils/
│   │   ├── audit.test.ts        # 审计日志测试
│   │   ├── date.test.ts         # 日期工具测试
│   │   └── format.test.ts       # 格式化工具测试
│   ├── hooks/
│   │   ├── useCRUDBase.test.ts  # CRUD Hook 测试
│   │   └── useAsync.test.ts     # 异步 Hook 测试
│   └── components/
│       └── features/
│           └── costLedger/
│               └── CostLedgerImportModal.test.tsx  # 组件测试
├── vitest.config.ts
├── coverage/                      # 覆盖率报告
└── package.json
```

---

## 九、实施路线图

### Phase 0: 基础设施（当前）

- [x] 评估现状
- [ ] 创建 `vitest.config.ts`
- [ ] 创建 `src/test/setup.ts`
- [ ] 添加 npm scripts
- [ ] 安装依赖

### Phase 1: 核心模块测试（+1周）

- [ ] `electron/database.ts` 单元测试（10个）
- [ ] `electron/cost-ledger.ts` 单元测试（15个）
- [ ] `electron/wage-calc.ts` 单元测试（10个）
- [ ] 覆盖率报告验证

### Phase 2: 工具层测试（+2周）

- [ ] `src/services/ocr.ts` 测试（8个）
- [ ] `src/utils/audit.ts` 测试（10个）
- [ ] `src/utils/date.ts` 测试（8个）
- [ ] `src/hooks/useCRUDBase.ts` 测试（10个）

### Phase 3: CI/CD 集成（+3周）

- [ ] 配置 GitHub Actions
- [ ] 设置 Husky hooks
- [ ] 配置 Codecov
- [ ] 覆盖率阈值告警

### Phase 4: 组件测试（后续迭代）

- [ ] `CostLedgerImportModal` 集成测试
- [ ] `DropdownMenu` 交互测试
- [ ] 关键页面 E2E 测试（Playwright）

---

## 十、风险与建议

### 10.1 主要风险

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Electron API Mock 复杂度 | 高 | 使用抽象层，逐步完善 |
| Main/Renderer 进程隔离 | 中 | Vitest Worker 隔离 |
| 依赖 fs/path 模块 | 高 | Mock 所有文件系统操作 |
| 异步测试不稳定 | 中 | 使用 `vi.useFakeTimers()` |
| 数据库状态污染 | 中 | 每个测试前 reset mock |

### 10.2 最佳实践建议

1. **测试数据工厂**：创建 `test/factories/` 目录管理测试数据
2. **快照测试**：对于复杂输出使用 `toMatchSnapshot()`
3. **参数化测试**：使用 `describe.each()` 测试多组输入
4. **测试文档**：每个测试用例添加中文注释说明
5. **持续集成**：测试失败阻止合并到 main 分支

---

## 十一、附录

### A. 示例测试用例模板

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { functionName } from '../path/to/module'

describe('模块名称', () => {
  describe('functionName', () => {
    it('should [预期行为] when [条件]', () => {
      // Arrange
      const input = 'test-value'
      
      // Act
      const result = functionName(input)
      
      // Assert
      expect(result).toBe('expected-value')
    })

    it('should [预期行为] when [边界条件]', () => {
      // Arrange
      const input = ''
      
      // Act & Assert
      expect(() => functionName(input)).toThrow('错误信息')
    })
  })
})
```

### B. Mock 快速参考

```typescript
// Mock 函数
const mockFn = vi.fn()

// Mock 返回值
mockFn.mockReturnValue('result')
mockFn.mockResolvedValue({ success: true })
mockFn.mockRejectedValue(new Error('error'))

// Mock 调用检查
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenCalledTimes(2)

// Mock 模块
vi.mock('../module', () => ({
  namedExport: mockFn,
  default: { method: mockFn },
}))
```

---

**文档版本**：1.0  
**下次审查**：Phase 1 完成后
