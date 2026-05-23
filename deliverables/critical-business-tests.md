# 关键业务风险测试用例

**创建时间**：2026-05-23  
**目标**：10-15 个关键测试，覆盖 80% 业务风险  
**当前覆盖率**：15.48% → 目标：35%

---

## 📊 业务风险矩阵

| 风险等级 | 业务模块 | 风险描述 | 影响范围 |
|---------|---------|---------|---------|
| 🔴 P0 | 成本台账双写 | JSON + SQLite 数据不一致 | 财务数据准确性 |
| 🔴 P0 | 工资源码计算 | 工资计算错误 | 工人薪酬纠纷 |
| 🔴 P0 | SQLite 迁移 | 数据丢失/损坏 | 全部业务数据 |
| 🟠 P1 | 发票状态机 | 状态更新错误 | 财务对账错误 |
| 🟠 P1 | IPC 权限守卫 | 未授权访问 | 数据安全 |
| 🟠 P1 | 数据快照恢复 | 无法回滚 | 数据无法恢复 |
| 🟡 P2 | Excel 导入 | 错误数据入库 | 数据质量 |
| 🟡 P2 | 考勤统计 | 出勤统计错误 | 工资计算基础 |
| 🟡 P2 | 合同状态统计 | 收款/付款统计错误 | 财务决策错误 |
| 🟢 P3 | OCR 识别 | 识别错误 | 数据录入效率 |

---

## 🧪 关键测试用例（15 个）

### 测试 1: 成本台账双写一致性测试 🔴 P0

**风险**：JSON 和 SQLite 数据不一致导致财务报表错误

**测试目标**：
- 验证写入成本台账时，JSON 和 SQLite 同时写入成功
- 验证读取时 SQLite 优先，JSON 回退逻辑正确
- 验证双写失败时事务回滚

**测试文件**：`src/__tests__/critical/cost-ledger-dual-write.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setupTestDB, cleanupTestDB } from '@/test-utils/db-helpers'
import { costLedgerQueries } from '@/sqlite/queries/cost-ledger'
import { ipcHandlers } from '@/ipc-handlers/cost-ledger'

describe('成本台账双写一致性', () => {
  beforeEach(async () => {
    await setupTestDB()
  })

  afterEach(async () => {
    await cleanupTestDB()
  })

  it('应同时写入 JSON 和 SQLite', async () => {
    const record = {
      projectId: 'proj-001',
      date: '2026-05-23',
      category: '材料费',
      amount: 10000,
      description: '测试材料采购'
    }

    // 写入
    const result = await ipcHandlers['db:costLedger:create'](null, record)

    // 验证 SQLite
    const sqliteRecord = await costLedgerQueries.getById(result.id)
    expect(sqliteRecord).toBeDefined()
    expect(sqliteRecord.amount).toBe(10000)

    // 验证 JSON (通过读取 IPC)
    const jsonRecords = await ipcHandlers['db:costLedger:list'](null, { projectId: 'proj-001' })
    const jsonRecord = jsonRecords.find(r => r.id === result.id)
    expect(jsonRecord).toBeDefined()
    expect(jsonRecord.amount).toBe(10000)
  })

  it('SQLite 优先读取，失败回退 JSON', async () => {
    const record = {
      projectId: 'proj-001',
      date: '2026-05-23',
      category: '材料费',
      amount: 5000
    }

    await ipcHandlers['db:costLedger:create'](null, record)

    // 模拟 SQLite 查询失败
    vi.spyOn(costLedgerQueries, 'list').mockRejectedValueOnce(new Error('SQLite error'))

    // 应该回退到 JSON
    const records = await ipcHandlers['db:costLedger:list'](null, { projectId: 'proj-001' })
    expect(records.length).toBeGreaterThan(0)
  })

  it('双写失败时应该回滚', async () => {
    const record = {
      projectId: 'proj-001',
      date: '2026-05-23',
      category: '材料费',
      amount: 8000
    }

    // 模拟 SQLite 写入失败
    vi.spyOn(costLedgerQueries, 'create').mockRejectedValueOnce(new Error('SQLite write failed'))

    // 期望整体失败
    await expect(ipcHandlers['db:costLedger:create'](null, record)).rejects.toThrow()

    // 验证 JSON 也没有写入（事务回滚）
    const records = await ipcHandlers['db:costLedger:list'](null, { projectId: 'proj-001' })
    const recordExists = records.some(r => r.amount === 8000)
    expect(recordExists).toBe(false)
  })
})
```

---

### 测试 2: 工资源码计算准确性测试 🔴 P0

**风险**：工资计算错误导致劳动纠纷

**测试目标**：
- 验证日工资 × 出勤天数 = 应发工资
- 验证考勤数据缺失时使用默认考勤
- 验证月中入职按比例计算

**测试文件**：`src/__tests__/critical/wage-calculation.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { calculateProjectWages } from '@/utils/wage-calculator'
import { computeAttendanceSummary } from '@/constants/attendance'

describe('工资源码计算准确性', () => {
  beforeEach(() => {
    // 重置 mock 数据
  })

  it('应按 日工资 × 出勤天数 计算', () => {
    const worker = {
      id: 'worker-001',
      name: '张三',
      dailyWage: 300,
      projectId: 'proj-001'
    }

    const attendance = {
      workerId: 'worker-001',
      yearMonth: '2026-05',
      presentDays: 22,
      absentDays: 8,
      leaveDays: 1
    }

    const result = calculateProjectWages(worker, attendance, '2026-05')

    // 300元/天 × 22天 = 6600元
    expect(result.totalWage).toBe(6600)
    expect(result.presentDays).toBe(22)
    expect(result.dailyWage).toBe(300)
  })

  it('应处理月中入职按比例计算', () => {
    const worker = {
      id: 'worker-002',
      name: '李四',
      dailyWage: 350,
      entryDate: '2026-05-15', // 5月15日入职
      projectId: 'proj-001'
    }

    const attendance = {
      workerId: 'worker-002',
      yearMonth: '2026-05',
      presentDays: 12, // 15-31日实际出勤12天
      absentDays: 0,
      leaveDays: 0
    }

    const result = calculateProjectWages(worker, attendance, '2026-05')

    // 入职前日期不应计入缺勤
    // 5月15日入职，应出勤天数 = 31 - 14 = 17天
    // 实际出勤12天，缺勤5天
    expect(result.presentDays).toBe(12)
    expect(result.totalWage).toBe(4200) // 350 × 12
  })

  it('应处理考勤数据缺失（使用默认考勤）', () => {
    const worker = {
      id: 'worker-003',
      name: '王五',
      dailyWage: 280,
      projectId: 'proj-001'
    }

    // 无考勤记录
    const attendance = null

    const result = calculateProjectWages(worker, attendance, '2026-05')

    // 应使用默认考勤（全勤）
    expect(result.presentDays).toBe(22) // 假设当月22个工作日
    expect(result.totalWage).toBe(6160) // 280 × 22
  })

  it('应正确计算加班费', () => {
    const worker = {
      id: 'worker-004',
      name: '赵六',
      dailyWage: 300,
      projectId: 'proj-001'
    }

    const attendance = {
      workerId: 'worker-004',
      yearMonth: '2026-05',
      presentDays: 22,
      overtimeHours: 30, // 30小时加班
      overtimeRate: 1.5 // 1.5倍加班费
    }

    const result = calculateProjectWages(worker, attendance, '2026-05')

    const normalWage = 300 * 22 // 6600
    const overtimeWage = (300 / 8) * 1.5 * 30 // 1687.5
    expect(result.totalWage).toBeCloseTo(8287.5, 1)
  })
})
```

---

### 测试 3: SQLite 数据迁移完整性测试 🔴 P0

**风险**：迁移过程中数据丢失或损坏

**测试目标**：
- 验证 JSON → SQLite 迁移的数据完整性
- 验证迁移失败自动回滚
- 验证迁移后数据校验（行数、字段值）

**测试文件**：`src/__tests__/critical/sqlite-migration.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { migrateDatabase } from '@/sqlite/migrate'
import { dbInit } from '@/sqlite/db-init'
import { backupDatabase } from '@/sqlite/backup'

describe('SQLite 数据迁移完整性', () => {
  beforeEach(async () => {
    await dbInit.initialize()
  })

  afterEach(async () => {
    await dbInit.close()
  })

  it('应完整迁移 JSON 数据到 SQLite', async () => {
    // 准备测试数据（JSON）
    const jsonData = {
      costLedger: [
        { id: '1', projectId: 'proj-001', amount: 10000, category: '材料费' },
        { id: '2', projectId: 'proj-001', amount: 5000, category: '人工费' }
      ],
      projects: [
        { id: 'proj-001', name: '测试项目' }
      ]
    }

    // 执行迁移
    const result = await migrateDatabase(jsonData)

    // 验证迁移结果
    expect(result.success).toBe(true)
    expect(result.migratedTables).toContain('cost_ledger')
    expect(result.migratedTables).toContain('projects')

    // 验证数据行数
    expect(result.rowCounts.cost_ledger).toBe(2)
    expect(result.rowCounts.projects).toBe(1)
  })

  it('迁移失败时应自动回滚', async () => {
    // 准备无效数据（缺失必填字段）
    const invalidData = {
      costLedger: [
        { id: '1', projectId: null, amount: 10000 } // 缺失 category
      ]
    }

    // 期望迁移失败
    await expect(migrateDatabase(invalidData)).rejects.toThrow()

    // 验证回滚（SQLite 中无数据）
    const db = dbInit.getDatabase()
    const count = db.prepare('SELECT COUNT(*) as count FROM cost_ledger').get()
    expect(count.count).toBe(0)
  })

  it('迁移前应自动备份', async () => {
    // 监听备份调用
    const backupSpy = vi.spyOn(backupDatabase, 'create')

    const jsonData = {
      costLedger: [{ id: '1', projectId: 'proj-001', amount: 10000, category: '材料费' }]
    }

    await migrateDatabase(jsonData)

    // 验证备份被调用
    expect(backupSpy).toHaveBeenCalledTimes(1)
  })

  it('应校验迁移后数据一致性', async () => {
    const jsonData = {
      costLedger: [
        { id: '1', projectId: 'proj-001', amount: 10000, category: '材料费' },
        { id: '2', projectId: 'proj-001', amount: 5000, category: '人工费' }
      ]
    }

    const result = await migrateDatabase(jsonData)

    // 校验每行数据
    for (const jsonRecord of jsonData.costLedger) {
      const sqliteRecord = await dbInit.getDatabase()
        .prepare('SELECT * FROM cost_ledger WHERE id = ?')
        .get(jsonRecord.id)

      expect(sqliteRecord).toBeDefined()
      expect(sqliteRecord.amount).toBe(jsonRecord.amount)
      expect(sqliteRecord.category).toBe(jsonRecord.category)
    }
  })
})
```

---

### 测试 4: 发票状态自动更新测试 🟠 P1

**风险**：发票状态更新错误导致财务对账错误

**测试目标**：
- 验证收票后状态自动更新为"已收票"
- 验证部分付款后状态更新为"部分付款"
- 验证付清后状态更新为"已付清"

**测试文件**：`src/__tests__/critical/invoice-status.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { InvoiceList } from '@/components/features/invoices/InvoiceList'
import { ipcHandlers } from '@/ipc-handlers/invoices'

describe('发票状态自动更新', () => {
  beforeEach(() => {
    // Mock IPC
    ipcHandlers['db:invoices:list'] = vi.fn().mockResolvedValue([
      {
        id: 'inv-001',
        kind: 'paper_special',
        type: 'invoice_in',
        status: '已收票',
        totalAmount: 10000,
        paidAmount: 0
      }
    ])
  })

  it('收票后应自动更新状态为"已收票"', async () => {
    render(<InvoiceList projectId="proj-001" />)

    // 模拟收票操作
    const receiveButton = screen.getByText('收票')
    fireEvent.click(receiveButton)

    // 验证状态更新
    expect(ipcHandlers['db:invoices:update']).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        id: 'inv-001',
        status: '已收票'
      })
    )
  })

  it('部分付款后应更新状态为"部分付款"', async () => {
    const invoice = {
      id: 'inv-002',
      kind: 'paper_special',
      type: 'invoice_in',
      status: '已收票',
      totalAmount: 10000,
      paidAmount: 0
    }

    // 模拟付款 5000 元
    const payment = {
      invoiceId: 'inv-002',
      amount: 5000,
      date: '2026-05-23'
    }

    await ipcHandlers['db:invoices:addPayment'](null, payment)

    // 验证状态更新为"部分付款"
    const updatedInvoice = await ipcHandlers['db:invoices:get'](null, 'inv-002')
    expect(updatedInvoice.status).toBe('部分付款')
    expect(updatedInvoice.paidAmount).toBe(5000)
  })

  it('付清后应更新状态为"已付清"', async () => {
    const invoice = {
      id: 'inv-003',
      kind: 'paper_special',
      type: 'invoice_in',
      status: '部分付款',
      totalAmount: 10000,
      paidAmount: 5000
    }

    // 模拟付款剩余 5000 元
    const payment = {
      invoiceId: 'inv-003',
      amount: 5000,
      date: '2026-05-23'
    }

    await ipcHandlers['db:invoices:addPayment'](null, payment)

    // 验证状态更新为"已付清"
    const updatedInvoice = await ipcHandlers['db:invoices:get'](null, 'inv-003')
    expect(updatedInvoice.status).toBe('已付清')
    expect(updatedInvoice.paidAmount).toBe(10000)
  })

  it('开票后应自动更新状态为"已开具"', async () => {
    const invoice = {
      id: 'inv-004',
      kind: 'electronic_special',
      type: 'invoice_out',
      status: '草稿',
      totalAmount: 20000,
      receivedAmount: 0
    }

    // 模拟开具发票
    await ipcHandlers['db:invoices:updateStatus'](null, {
      id: 'inv-004',
      status: '已开具'
    })

    const updatedInvoice = await ipcHandlers['db:invoices:get'](null, 'inv-004')
    expect(updatedInvoice.status).toBe('已开具')
  })
})
```

---

### 测试 5: IPC 权限守卫测试 🟠 P1

**风险**：未授权 IPC 调用导致数据泄露

**测试目标**：
- 验证未授权用户无法调用敏感 IPC 通道
- 验证权限映射正确加载
- 验证越权操作被拒绝

**测试文件**：`src/__tests__/critical/ipc-guard.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ipcGuard } from '@/ipc-guard'
import { AuthProvider } from '@/contexts/AuthContext'

describe('IPC 权限守卫', () => {
  beforeEach(() => {
    // 重置权限映射
    ipcGuard.clearCache()
  })

  it('未授权用户应被拒绝访问敏感通道', async () => {
    const unauthUser = {
      role: 'guest',
      permissions: []
    }

    // 模拟未授权用户调用
    const result = await ipcGuard.checkPermission(
      'db:costLedger:delete',
      unauthUser
    )

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('权限不足')
  })

  it('授权用户应允许访问对应通道', async () => {
    const authUser = {
      role: 'admin',
      permissions: ['cost:delete', 'project:edit']
    }

    const result = await ipcGuard.checkPermission(
      'db:costLedger:delete',
      authUser
    )

    expect(result.allowed).toBe(true)
  })

  it('应正确加载权限映射表', () => {
    const mapping = ipcGuard.getPermissionMapping()

    // 验证关键通道有权限映射
    expect(mapping['db:costLedger:delete']).toBeDefined()
    expect(mapping['db:projects:create']).toBeDefined()
    expect(mapping['db:workers:list']).toBeDefined()
  })

  it('越权操作应记录审计日志', async () => {
    const guestUser = {
      role: 'guest',
      permissions: ['project:view']
    }

    // 尝试越权操作
    await ipcGuard.checkPermission('db:costLedger:delete', guestUser)

    // 验证审计日志
    const auditLogs = await ipcHandlers['db:auditLogs:list'](null, {})
    const lastLog = auditLogs[auditLogs.length - 1]

    expect(lastLog.action).toBe('permission_denied')
    expect(lastLog.userId).toBe(guestUser.id)
    expect(lastLog.resource).toBe('costLedger')
  })

  it('应支持自定义权限规则', async () => {
    // 添加自定义规则：只有项目成员可以查看项目成本
    ipcGuard.addRule('db:costLedger:list', (user, context) => {
      return user.projectIds.includes(context.projectId)
    })

    const user = {
      role: 'member',
      projectIds: ['proj-001']
    }

    const result1 = await ipcGuard.checkPermission(
      'db:costLedger:list',
      user,
      { projectId: 'proj-001' }
    )
    expect(result1.allowed).toBe(true)

    const result2 = await ipcGuard.checkPermission(
      'db:costLedger:list',
      user,
      { projectId: 'proj-002' } // 不在用户项目列表中
    )
    expect(result2.allowed).toBe(false)
  })
})
```

---

### 测试 6: 数据快照创建与恢复测试 🟠 P1

**风险**：数据损坏后无法恢复

**测试目标**：
- 验证快照创建成功
- 验证快照恢复正确
- 验证快照清理（最多200个）

**测试文件**：`src/__tests__/critical/data-snapshot.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { snapshotManager } from '@/utils/snapshot-manager'
import { ipcHandlers } from '@/ipc-handlers/sqlite-status'

describe('数据快照创建与恢复', () => {
  beforeEach(async () => {
    await snapshotManager.cleanup()
  })

  afterEach(async () => {
    await snapshotManager.cleanup()
  })

  it('应成功创建快照', async () => {
    const result = await snapshotManager.create('测试快照')

    expect(result.success).toBe(true)
    expect(result.snapshotId).toBeDefined()
    expect(result.filePath).toContain('snapshots/')
  })

  it('应成功恢复快照', async () => {
    // 创建快照
    const snapshot = await snapshotManager.create('恢复测试快照')

    // 修改数据
    await ipcHandlers['db:costLedger:create'](null, {
      projectId: 'proj-001',
      amount: 99999,
      category: '测试'
    })

    // 恢复快照
    const restoreResult = await snapshotManager.restore(snapshot.snapshotId)
    expect(restoreResult.success).toBe(true)

    // 验证数据恢复
    const records = await ipcHandlers['db:costLedger:list'](null, {})
    const testRecord = records.find(r => r.amount === 99999)
    expect(testRecord).toBeUndefined() // 恢复后不存在
  })

  it('快照数量应限制在 200 个', async () => {
    // 创建 201 个快照
    for (let i = 0; i < 201; i++) {
      await snapshotManager.create(`快照 ${i}`)
    }

    const snapshots = await snapshotManager.list()
    expect(snapshots.length).toBe(200)

    // 验证最旧的快照被删除
    const oldestSnapshot = snapshots[snapshots.length - 1]
    expect(oldestSnapshot.name).toBe('快照 1') // 应该被删除
  })

  it('快照应包含所有必要数据', async () => {
    // 准备测试数据
    await ipcHandlers['db:projects:create'](null, {
      id: 'proj-snap-test',
      name: '快照测试项目'
    })

    const snapshot = await snapshotManager.create('完整数据快照')

    // 验证快照内容
    const snapshotData = await snapshotManager.load(snapshot.snapshotId)
    expect(snapshotData.projects).toBeDefined()
    expect(snapshotData.projects.length).toBeGreaterThan(0)
    expect(snapshotData.projects[0].id).toBe('proj-snap-test')
  })

  it('恢复失败时应回滚', async () => {
    const snapshot = await snapshotManager.create('恢复失败测试')

    // 模拟恢复失败（损坏的快照文件）
    vi.spyOn(snapshotManager, 'load').mockRejectedValueOnce(new Error('Corrupted snapshot'))

    await expect(snapshotManager.restore(snapshot.snapshotId)).rejects.toThrow()

    // 验证数据库未被破坏
    const dbStatus = await ipcHandlers['sqlite:status'](null)
    expect(dbStatus.initialized).toBe(true)
  })
})
```

---

### 测试 7: Excel 导入数据校验测试 🟡 P2

**风险**：错误数据入库导致数据质量問題

**测试目标**：
- 验证成本台账 Excel 导入的列映射正确
- 验证必填字段校验
- 验证错误数据拒绝入库

**测试文件**：`src/__tests__/critical/excel-import.test.tsx`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CostLedgerImportModal } from '@/components/features/costLedger/CostLedgerImportModal'
import * as XLSX from 'xlsx'

describe('Excel 导入数据校验', () => {
  beforeEach(() => {
    // Mock XLSX
    vi.mock('xlsx')
  })

  it('应正确映射 Excel 列到数据字段', async () => {
    const mockExcelData = [
      { '日期': '2026-05-23', '类别': '材料费', '金额': 10000, '说明': '测试材料' },
      { '日期': '2026-05-24', '类别': '人工费', '金额': 5000, '说明': '测试人工' }
    ]

    vi.mocked(XLSX.read).mockReturnValue({
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: XLSX.utils.json_to_sheet(mockExcelData)
      }
    })

    render(<CostLedgerImportModal projectId="proj-001" onClose={() => {}} />)

    // 模拟文件上传
    const fileInput = screen.getByLabelText('选择文件')
    const file = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    // 验证列映射
    expect(screen.getByText('日期 → date')).toBeInTheDocument()
    expect(screen.getByText('类别 → category')).toBeInTheDocument()
    expect(screen.getByText('金额 → amount')).toBeInTheDocument()
    expect(screen.getByText('说明 → description')).toBeInTheDocument()
  })

  it('应拒绝缺失必填字段的数据', async () => {
    const invalidData = [
      { '日期': '2026-05-23', '金额': 10000 }, // 缺失类别
      { '类别': '材料费', '金额': 5000 } // 缺失日期
    ]

    render(<CostLedgerImportModal projectId="proj-001" onClose={() => {}} />)

    // 模拟导入
    const importButton = screen.getByText('导入')
    fireEvent.click(importButton)

    // 验证错误提示
    expect(screen.getByText('缺失必填字段：类别')).toBeInTheDocument()
    expect(screen.getByText('缺失必填字段：日期')).toBeInTheDocument()
  })

  it('应正确校验数据类型', async () => {
    const invalidData = [
      { '日期': '2026-05-23', '类别': '材料费', '金额': '不是数字', '说明': '测试' }
    ]

    render(<CostLedgerImportModal projectId="proj-001" onClose={() => {}} />)

    // 模拟导入
    const importButton = screen.getByText('导入')
    fireEvent.click(importButton)

    // 验证类型错误
    expect(screen.getByText('金额必须是数字')).toBeInTheDocument()
  })

  it('应支持分类学习（自动映射相似列名）', async () => {
    const excelData = [
      { '发生日期': '2026-05-23', '费用类别': '材料费', '费用金额': 10000, '备注': '测试' }
    ]

    render(<CostLedgerImportModal projectId="proj-001" onClose={() => {}} />)

    // 模拟文件上传
    // ...

    // 验证智能映射
    expect(screen.getByText('发生日期 → date (智能匹配)')).toBeInTheDocument()
    expect(screen.getByText('费用类别 → category (智能匹配)')).toBeInTheDocument()
    expect(screen.getByText('费用金额 → amount (智能匹配)')).toBeInTheDocument()
  })
})
```

---

### 测试 8: 考勤统计准确性测试 🟡 P2

**风险**：出勤统计错误影响工资计算

**测试目标**：
- 验证出勤/缺勤/全勤率计算正确
- 验证入职前日期不计入统计
- 验证考勤时间线汇总正确

**测试文件**：`src/__tests__/critical/attendance-statistics.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { computeAttendanceSummary } from '@/constants/attendance'
import { AttendanceTimeline } from '@/components/features/hr/AttendanceTimeline'

describe('考勤统计准确性', () => {
  beforeEach(() => {
    // 重置
  })

  it('应正确计算出勤/缺勤/全勤率', () => {
    const attendanceData = {
      yearMonth: '2026-05',
      days: Array(31).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: i < 22 ? 'present' : 'absent' // 前22天出勤，后9天缺勤
      }))
    }

    const summary = computeAttendanceSummary(attendanceData, '2026-05')

    expect(summary.presentDays).toBe(22)
    expect(summary.absentDays).toBe(9)
    expect(summary.leaveDays).toBe(0)
    expect(summary.fullAttendanceRate).toBeCloseTo(0.71, 2) // 22/31 ≈ 71%
  })

  it('入职前日期不应计入统计', () => {
    const attendanceData = {
      yearMonth: '2026-05',
      days: Array(31).fill(null).map((_, i) => ({
        date: `2026-05-${String(i + 1).padStart(2, '0')}`,
        status: 'present'
      }))
    }

    const entryDate = '2026-05-15' // 5月15日入职

    const summary = computeAttendanceSummary(attendanceData, '2026-05', entryDate)

    // 入职前14天不计入
    // 5月15-31日共17天，全部出勤
    expect(summary.presentDays).toBe(17)
    expect(summary.absentDays).toBe(0)
    expect(summary.fullAttendanceRate).toBe(1.0) // 100%
  })

  it('应正确汇总年度考勤时间线', () => {
    const timelineData = [
      { year: 2026, month: 1, presentDays: 20, absentDays: 11, leaveDays: 0 },
      { year: 2026, month: 2, presentDays: 18, absentDays: 8, leaveDays: 2 },
      { year: 2026, month: 3, presentDays: 22, absentDays: 9, leaveDays: 0 }
    ]

    const yearlySummary = computeAttendanceSummary.yearly(timelineData)

    expect(yearlySummary.totalPresentDays).toBe(60)
    expect(yearlySummary.totalAbsentDays).toBe(28)
    expect(yearlySummary.totalLeaveDays).toBe(2)
    expect(yearlySummary.overallAttendanceRate).toBeCloseTo(0.66, 2) // 60/91 ≈ 66%
  })

  it('应处理空考勤记录', () => {
    const attendanceData = {
      yearMonth: '2026-05',
      days: []
    }

    const summary = computeAttendanceSummary(attendanceData, '2026-05')

    expect(summary.presentDays).toBe(0)
    expect(summary.absentDays).toBe(0)
    expect(summary.fullAttendanceRate).toBe(0)
  })

  it('应标记入职前日期为不可操作', () => {
    render(<AttendanceTimeline memberId="member-001" entryDate="2026-05-15" />)

    // 验证5月15日前的日期显示为灰色
    const may14Cell = screen.getByTestId('attendance-day-2026-05-14')
    expect(may14Cell).toHaveClass('bg-gray-200', 'cursor-not-allowed')

    const may15Cell = screen.getByTestId('attendance-day-2026-05-15')
    expect(may15Cell).not.toHaveClass('bg-gray-200')
  })
})
```

---

### 测试 9: 合同状态统计准确性测试 🟡 P2

**风险**：收付款统计错误影响财务决策

**测试目标**：
- 验证收入合同收款统计正确
- 验证支出合同付款统计正确
- 验证合同状态自动更新

**测试文件**：`src/__tests__/critical/contract-statistics.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { computeContractStats } from '@/utils/contract-stats'
import { ipcHandlers } from '@/ipc-handlers/contracts'

describe('合同状态统计准确性', () => {
  beforeEach(() => {
    // Mock 数据
  })

  it('应正确统计收入合同收款进度', async () => {
    const contract = {
      id: 'contract-001',
      type: 'income',
      totalAmount: 100000,
      status: '执行中'
    }

    const payments = [
      { id: 'pay-001', contractId: 'contract-001', amount: 30000, date: '2026-05-01' },
      { id: 'pay-002', contractId: 'contract-001', amount: 50000, date: '2026-05-15' }
    ]

    const stats = computeContractStats(contract, payments)

    expect(stats.totalReceived).toBe(80000)
    expect(stats.remaining).toBe(20000)
    expect(stats.completionRate).toBe(0.8) // 80%
    expect(stats.status).toBe('部分收款')
  })

  it('应正确统计支出合同付款进度', async () => {
    const contract = {
      id: 'contract-002',
      type: 'expense',
      totalAmount: 50000,
      status: '执行中'
    }

    const payments = [
      { id: 'pay-003', contractId: 'contract-002', amount: 50000, date: '2026-05-20' }
    ]

    const stats = computeContractStats(contract, payments)

    expect(stats.totalPaid).toBe(50000)
    expect(stats.remaining).toBe(0)
    expect(stats.completionRate).toBe(1.0) // 100%
    expect(stats.status).toBe('已付清')
  })

  it('收款/付款完成后应自动更新合同状态', async () => {
    const contract = {
      id: 'contract-003',
      type: 'income',
      totalAmount: 100000,
      status: '部分收款'
    }

    // 模拟最后一笔收款
    await ipcHandlers['db:contracts:addPayment'](null, {
      contractId: 'contract-003',
      amount: 20000, // 之前收了80000，再收20000
      date: '2026-05-23'
    })

    const updatedContract = await ipcHandlers['db:contracts:get'](null, 'contract-003')
    expect(updatedContract.status).toBe('已收齐')
  })

  it('应正确处理无付款记录合同', () => {
    const contract = {
      id: 'contract-004',
      type: 'income',
      totalAmount: 50000,
      status: '生效'
    }

    const payments = []

    const stats = computeContractStats(contract, payments)

    expect(stats.totalReceived).toBe(0)
    expect(stats.remaining).toBe(50000)
    expect(stats.completionRate).toBe(0)
    expect(stats.status).toBe('已开具') // 未收款
  })
})
```

---

### 测试 10: SQLite 读取模式切换测试 🟡 P2

**风险**：读取模式切换错误导致数据不可用

**测试目标**：
- 验证 dual 模式（SQLite优先 + JSON回退）
- 验证 sqlite-primary 模式（仅SQLite，失败返回错误）
- 验证 json-only 模式（仅JSON）

**测试文件**：`src/__tests__/critical/sqlite-read-mode.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useSqliteRead } from '@/hooks/useSqliteSettings'
import { ipcHandlers } from '@/ipc-handlers/sqlite-status'

describe('SQLite 读取模式切换', () => {
  beforeEach(async () => {
    // 重置为默认模式
    await ipcHandlers['sqlite:setReadMode'](null, 'dual')
  })

  afterEach(async () => {
    await ipcHandlers['sqlite:setReadMode'](null, 'dual')
  })

  it('dual 模式应 SQLite 优先，失败回退 JSON', async () => {
    // 设置 dual 模式
    await ipcHandlers['sqlite:setReadMode'](null, 'dual')

    // 模拟 SQLite 查询失败
    vi.spyOn(ipcHandlers, 'sqlite:query').mockRejectedValueOnce(new Error('SQLite error'))

    // 读取数据
    const result = await ipcHandlers['db:costLedger:list'](null, { projectId: 'proj-001' })

    // 应该从 JSON 回退读取
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThanOrEqual(0)
  })

  it('sqlite-primary 模式应仅从 SQLite 读取', async () => {
    await ipcHandlers['sqlite:setReadMode'](null, 'sqlite-primary')

    // 模拟 SQLite 查询失败
    vi.spyOn(ipcHandlers, 'sqlite:query').mockRejectedValueOnce(new Error('SQLite error'))

    // 期望返回错误，不回退 JSON
    await expect(ipcHandlers['db:costLedger:list'](null, { projectId: 'proj-001' }))
      .rejects.toThrow('SQLite error')
  })

  it('json-only 模式应仅从 JSON 读取', async () => {
    await ipcHandlers['sqlite:setReadMode'](null, 'json-only')

    // 模拟 JSON 读取
    const jsonData = [{ id: '1', projectId: 'proj-001', amount: 10000 }]
    vi.spyOn(ipcHandlers, 'json:read').mockResolvedValueOnce(jsonData)

    const result = await ipcHandlers['db:costLedger:list'](null, { projectId: 'proj-001' })

    expect(result).toEqual(jsonData)
    expect(ipcHandlers['sqlite:query']).not.toHaveBeenCalled()
  })

  it('读取模式应在重启后保持（持久化）', async () => {
    // 设置模式
    await ipcHandlers['sqlite:setReadMode'](null, 'sqlite-primary')

    // 模拟重启（重新加载）
    await ipcHandlers['sqlite:loadPersistedReadMode'](null)

    const currentMode = await ipcHandlers['sqlite:getReadMode'](null)
    expect(currentMode).toBe('sqlite-primary')
  })

  it('应拒绝无效读取模式', async () => {
    await expect(ipcHandlers['sqlite:setReadMode'](null, 'invalid-mode'))
      .rejects.toThrow('无效的读取模式')
  })
})
```

---

### 测试 11: 工人跨项目关联测试 🟡 P2

**风险**：工人在不同项目的工种/工资混淆

**测试目标**：
- 验证同一工人在不同项目的工种独立
- 验证同一工人在不同项目的日工资独立
- 验证工人库默认值 vs 项目覆盖值

**测试文件**：`src/__tests__/critical/worker-cross-project.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ipcHandlers } from '@/ipc-handlers/workers'
import { ipcHandlers as pwHandlers } from '@/ipc-handlers/project-workers'

describe('工人跨项目关联', () => {
  beforeEach(async () => {
    // 创建测试工人
    await ipcHandlers['db:workers:create'](null, {
      id: 'worker-001',
      name: '张三',
      workerType: '钢筋工',
      dailyWage: 300,
      idCard: '510923199001011234'
    })
  })

  it('同一工人在不同项目应有独立的工种', async () => {
    // 项目A：钢筋工
    await pwHandlers['db:projectWorkers:create'](null, {
      workerId: 'worker-001',
      projectId: 'proj-A',
      workerType: '钢筋工',
      dailyWage: 300
    })

    // 项目B：改为焊工
    await pwHandlers['db:projectWorkers:create'](null, {
      workerId: 'worker-001',
      projectId: 'proj-B',
      workerType: '焊工',
      dailyWage: 350
    })

    // 验证项目A
    const pwA = await pwHandlers['db:projectWorkers:get'](null, {
      workerId: 'worker-001',
      projectId: 'proj-A'
    })
    expect(pwA.workerType).toBe('钢筋工')

    // 验证项目B
    const pwB = await pwHandlers['db:projectWorkers:get'](null, {
      workerId: 'worker-001',
      projectId: 'proj-B'
    })
    expect(pwB.workerType).toBe('焊工')
  })

  it('同一工人在不同项目应有独立的日工资', async () => {
    // 项目A：300元/天
    await pwHandlers['db:projectWorkers:create'](null, {
      workerId: 'worker-001',
      projectId: 'proj-A',
      dailyWage: 300
    })

    // 项目B：400元/天
    await pwHandlers['db:projectWorkers:create'](null, {
      workerId: 'worker-001',
      projectId: 'proj-B',
      dailyWage: 400
    })

    const pwA = await pwHandlers['db:projectWorkers:get'](null, {
      workerId: 'worker-001',
      projectId: 'proj-A'
    })
    expect(pwA.dailyWage).toBe(300)

    const pwB = await pwHandlers['db:projectWorkers:get'](null, {
      workerId: 'worker-001',
      projectId: 'proj-B'
    })
    expect(pwB.dailyWage).toBe(400)
  })

  it('应使用工人库默认值（当项目未覆盖时）', async () => {
    // 仅创建工人库记录（有默认值）
    // 不创建 projectWorker 记录

    const worker = await ipcHandlers['db:workers:get'](null, 'worker-001')
    expect(worker.workerType).toBe('钢筋工')
    expect(worker.dailyWage).toBe(300)
  })

  it('导入更新应正确匹配身份证号', async () => {
    const importData = [
      {
        '姓名': '张三',
        '身份证': '510923199001011234',
        '工种': '架子工',
        '日工资': 320
      }
    ]

    await ipcHandlers['db:workers:importBatch'](null, importData)

    // 验证更新（不是新建）
    const workers = await ipcHandlers['db:workers:list'](null, {})
    const worker = workers.find(w => w.idCard === '510923199001011234')
    
    expect(worker.name).toBe('张三')
    expect(worker.workerType).toBe('架子工') // 更新为架子工
    expect(worker.dailyWage).toBe(320) // 更新为320元
  })
})
```

---

### 测试 12: 项目健康度计算测试 🟡 P2

**风险**：健康度计算错误导致项目风险评估失误

**测试目标**：
- 验证五维雷达图计算逻辑
- 验证 KPI 指标计算正确
- 验证健康度环显示正确

**测试文件**：`src/__tests__/critical/project-health.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { computeProjectHealth } from '@/utils/project-health'
import { ProjectCommandCenter } from '@/components/features/projects/ProjectCommandCenter'

describe('项目健康度计算', () => {
  beforeEach(() => {
    // 重置
  })

  it('应正确计算五维健康度', () => {
    const project = {
      id: 'proj-001',
      name: '测试项目',
      budget: 1000000,
      spent: 600000,
      schedule: 0.65, // 65% 进度
      quality: 0.9, // 90% 质量
      safety: 0.95, // 95% 安全
      costControl: 0.85 // 85% 成本控制
    }

    const health = computeProjectHealth(project)

    // 验证五维得分
    expect(health.dimensions.schedule).toBe(0.65)
    expect(health.dimensions.quality).toBe(0.9)
    expect(health.dimensions.safety).toBe(0.95)
    expect(health.dimensions.costControl).toBe(0.85)
    
    // 验证综合健康度（加权平均）
    const expectedOverall = (0.65 + 0.9 + 0.95 + 0.85 + 0.8) / 5 // 假设风险维度0.8
    expect(health.overall).toBeCloseTo(expectedOverall, 2)
  })

  it('应正确计算 KPI 指标', () => {
    const project = {
      id: 'proj-001',
      budget: 1000000,
      spent: 600000,
      contracts: [
        { id: 'c1', type: 'income', totalAmount: 800000, status: '部分收款' },
        { id: 'c2', type: 'expense', totalAmount: 500000, status: '已付清' }
      ],
      workers: [
        { id: 'w1', projectId: 'proj-001' },
        { id: 'w2', projectId: 'proj-001' }
      ]
    }

    const kpi = computeProjectHealth.computeKPI(project)

    expect(kpi.totalBudget).toBe(1000000)
    expect(kpi.totalSpent).toBe(600000)
    expect(kpi.budgetUsage).toBe(0.6) // 60%
    expect(kpi.incomeContracts).toBe(800000)
    expect(kpi.expenseContracts).toBe(500000)
    expect(kpi.activeWorkers).toBe(2)
  })

  it('应正确渲染健康度环', () => {
    render(<ProjectCommandCenter projectId="proj-001" />)

    // 验证健康度环显示
    const healthRing = screen.getByTestId('health-ring')
    expect(healthRing).toBeInTheDocument()
    
    // 验证颜色（根据健康度）
    const health = computeProjectHealth({ /* ... */ })
    if (health.overall >= 0.8) {
      expect(healthRing).toHaveClass('text-green-500')
    } else if (health.overall >= 0.6) {
      expect(healthRing).toHaveClass('text-yellow-500')
    } else {
      expect(healthRing).toHaveClass('text-red-500')
    }
  })

  it('应处理缺失数据', () => {
    const project = {
      id: 'proj-002',
      name: '新项目',
      budget: 0,
      spent: 0,
      contracts: [],
      workers: []
    }

    const health = computeProjectHealth(project)

    expect(health.overall).toBe(0)
    expect(health.dimensions.schedule).toBe(0)
    expect(health.dimensions.quality).toBe(0)
  })
})
```

---

### 测试 13: 结算办理核验逻辑测试 🟡 P2

**风险**：结算核验错误导致财务损失

**测试目标**：
- 验证发票匹配逻辑
- 验证付款汇总正确
- 验证差额警示

**测试文件**：`src/__tests__/critical/settlement-verification.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { verifySettlement } from '@/utils/settlement-verifier'
import { ipcHandlers } from '@/ipc-handlers/settlements'

describe('结算办理核验逻辑', () => {
  beforeEach(() => {
    // 准备测试数据
  })

  it('应按结算单位自动匹配发票', async () => {
    const settlement = {
      id: 'settlement-001',
      projectId: 'proj-001',
      unit: '供应商A',
      amount: 100000,
      category: '材料结算'
    }

    const invoices = [
      { id: 'inv-001', sellerName: '供应商A', totalAmount: 60000, status: '已收票' },
      { id: 'inv-002', sellerName: '供应商A', totalAmount: 40000, status: '已收票' }
    ]

    const result = await verifySettlement(settlement, invoices)

    expect(result.matchedInvoices.length).toBe(2)
    expect(result.matchedInvoices[0].id).toBe('inv-001')
    expect(result.matchedInvoices[1].id).toBe('inv-002')
    expect(result.totalMatchedAmount).toBe(100000)
  })

  it('应正确汇总付款', async () => {
    const settlement = {
      id: 'settlement-002',
      projectId: 'proj-001',
      unit: '供应商B',
      amount: 80000
    }

    const payments = [
      { id: 'pay-001', settlementId: 'settlement-002', amount: 50000, date: '2026-05-10' },
      { id: 'pay-002', settlementId: 'settlement-002', amount: 30000, date: '2026-05-20' }
    ]

    const result = await verifySettlement.computePayments(settlement, payments)

    expect(result.totalPaid).toBe(80000)
    expect(result.remaining).toBe(0)
    expect(result.isFullyPaid).toBe(true)
  })

  it('应警示差额（发票金额 ≠ 结算金额）', async () => {
    const settlement = {
      id: 'settlement-003',
      projectId: 'proj-001',
      unit: '供应商C',
      amount: 100000
    }

    const invoices = [
      { id: 'inv-003', sellerName: '供应商C', totalAmount: 90000, status: '已收票' } // 少10000
    ]

    const result = await verifySettlement(settlement, invoices)

    expect(result.hasDiscrepancy).toBe(true)
    expect(result.discrepancyAmount).toBe(10000)
    expect(result.warningMessage).toContain('发票金额与结算金额不符')
  })

  it('应自动更新结算状态', async () => {
    const settlement = {
      id: 'settlement-004',
      projectId: 'proj-001',
      status: '未办理'
    }

    // 模拟办理
    await ipcHandlers['db:settlements:process'](null, {
      id: 'settlement-004',
      action: 'process'
    })

    const updated = await ipcHandlers['db:settlements:get'](null, 'settlement-004')
    expect(updated.status).toBe('已办理')
  })
})
```

---

### 测试 14: 身份证 OCR 识别准确性测试 🟢 P3

**风险**：OCR 识别错误导致身份录入错误

**测试目标**：
- 验证 OCR 识别结果解析正确
- 验证身份证字段提取准确
- 验证识别失败处理

**测试文件**：`src/__tests__/critical/ocr-identity.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseIdentityCard } from '@/utils/ocr-parser'
import { ipcHandlers } from '@/ipc-handlers/ocr'

describe('身份证 OCR 识别准确性', () => {
  beforeEach(() => {
    // Mock OCR 服务
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('应正确解析身份证正面（姓名+身份证号）', async () => {
    const mockOCRResult = {
      success: true,
      data: {
        name: '张三',
        idCard: '510923199001011234',
        address: '四川省成都市武侯区',
        confidence: 0.95
      }
    }

    vi.spyOn(ipcHandlers, 'ocr:recognize').mockResolvedValueOnce(mockOCRResult)

    const result = await parseIdentityCard('id-card-front.jpg')

    expect(result.success).toBe(true)
    expect(result.data.name).toBe('张三')
    expect(result.data.idCard).toBe('510923199001011234')
    expect(result.data.address).toBe('四川省成都市武侯区')
  })

  it('应正确解析身份证背面（签发机关+有效期）', async () => {
    const mockOCRResult = {
      success: true,
      data: {
        authority: '成都市公安局',
        validFrom: '2020-01-01',
        validTo: '2030-01-01'
      }
    }

    vi.spyOn(ipcHandlers, 'ocr:recognize').mockResolvedValueOnce(mockOCRResult)

    const result = await parseIdentityCard('id-card-back.jpg')

    expect(result.success).toBe(true)
    expect(result.data.authority).toBe('成都市公安局')
    expect(result.data.validFrom).toBe('2020-01-01')
    expect(result.data.validTo).toBe('2030-01-01')
  })

  it('应校验身份证号合法性', async () => {
    const mockOCRResult = {
      success: true,
      data: {
        name: '李四',
        idCard: '123456789012345678', // 无效身份证号
        confidence: 0.7
      }
    }

    vi.spyOn(ipcHandlers, 'ocr:recognize').mockResolvedValueOnce(mockOCRResult)

    const result = await parseIdentityCard('invalid-id-card.jpg')

    expect(result.success).toBe(false)
    expect(result.error).toContain('身份证号格式错误')
  })

  it('应处理 OCR 识别失败', async () => {
    vi.spyOn(ipcHandlers, 'ocr:recognize').mockRejectedValueOnce(new Error('OCR service unavailable'))

    const result = await parseIdentityCard('corrupted-image.jpg')

    expect(result.success).toBe(false)
    expect(result.error).toContain('OCR识别失败')
  })

  it('应自动填入工人表单', async () => {
    const ocrResult = {
      success: true,
      data: {
        name: '王五',
        idCard: '510923199501011234',
        gender: '男',
        birthDate: '1995-01-01',
        address: '四川省绵阳市'
      }
    }

    render(<WorkerForm />)

    // 模拟 OCR 识别
    const ocrButton = screen.getByText('OCR识别')
    fireEvent.click(ocrButton)

    // 验证表单自动填入
    expect(screen.getByLabelText('姓名')).toHaveValue('王五')
    expect(screen.getByLabelText('身份证号')).toHaveValue('510923199501011234')
    expect(screen.getByLabelText('性别')).toHaveValue('男')
    expect(screen.getByLabelText('出生日期')).toHaveValue('1995-01-01')
  })
})
```

---

### 测试 15: 数据完整性校验测试 🔴 P0

**风险**：数据关联关系破坏导致系统错误

**测试目标**：
- 验证外键约束
- 验证级联删除正确
- 验证数据关联关系完整

**测试文件**：`src/__tests__/critical/data-integrity.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { dbInit } from '@/sqlite/db-init'
import { ipcHandlers } from '@/ipc-handlers/projects'

describe('数据完整性校验', () => {
  beforeEach(async () => {
    await dbInit.initialize()
  })

  afterEach(async () => {
    await dbInit.close()
  })

  it('删除项目时应级联删除关联的工人', async () => {
    // 创建项目
    const project = await ipcHandlers['db:projects:create'](null, {
      id: 'proj-del-test',
      name: '删除测试项目'
    })

    // 添加工人到项目
    await ipcHandlers['db:projectWorkers:create'](null, {
      workerId: 'worker-001',
      projectId: 'proj-del-test',
      workerType: '钢筋工',
      dailyWage: 300
    })

    // 验证工人已关联
    let workers = await ipcHandlers['db:projectWorkers:list'](null, {
      projectId: 'proj-del-test'
    })
    expect(workers.length).toBe(1)

    // 删除项目
    await ipcHandlers['db:projects:delete'](null, 'proj-del-test')

    // 验证工人也被删除（级联删除）
    workers = await ipcHandlers['db:projectWorkers:list'](null, {
      projectId: 'proj-del-test'
    })
    expect(workers.length).toBe(0)
  })

  it('删除合同时应校验关联发票', async () => {
    // 创建合同
    const contract = await ipcHandlers['db:contracts:create'](null, {
      id: 'contract-del-test',
      type: 'income',
      totalAmount: 100000
    })

    // 创建关联发票
    await ipcHandlers['db:invoices:create'](null, {
      id: 'inv-del-test',
      contractId: 'contract-del-test',
      type: 'invoice_out',
      totalAmount: 100000
    })

    // 尝试删除合同（应失败，有关联发票）
    await expect(ipcHandlers['db:contracts:delete'](null, 'contract-del-test'))
      .rejects.toThrow('无法删除：存在关联发票')

    // 先删除发票
    await ipcHandlers['db:invoices:delete'](null, 'inv-del-test')

    // 再删除合同（应成功）
    await expect(ipcHandlers['db:contracts:delete'](null, 'contract-del-test'))
      .resolves.toBeDefined()
  })

  it('应校验必填字段', async () => {
    // 缺失必填字段
    const invalidProject = {
      id: 'proj-invalid',
      // 缺失 name
    }

    await expect(ipcHandlers['db:projects:create'](null, invalidProject))
      .rejects.toThrow('项目名称不能为空')
  })

  it('应校验数据类型', async () => {
    const invalidProject = {
      id: 'proj-invalid-type',
      name: '类型测试项目',
      budget: '不是数字' // 应该是数字
    }

    await expect(ipcHandlers['db:projects:create'](null, invalidProject))
      .rejects.toThrow('预算必须是数字')
  })
})
```

---

## 📈 预期覆盖率提升

| 测试文件 | 覆盖模块 | 预计新增覆盖率 |
|---------|---------|--------------|
| cost-ledger-dual-write.test.ts | SQLite 双写逻辑 | +3% |
| wage-calculation.test.ts | 工资计算 | +2% |
| sqlite-migration.test.ts | 数据迁移 | +2% |
| invoice-status.test.tsx | 发票状态机 | +1.5% |
| ipc-guard.test.ts | 权限守卫 | +1.5% |
| data-snapshot.test.ts | 快照系统 | +1% |
| excel-import.test.tsx | Excel 导入 | +1% |
| attendance-statistics.test.ts | 考勤统计 | +1% |
| contract-statistics.test.ts | 合同统计 | +1% |
| sqlite-read-mode.test.ts | 读取模式切换 | +1% |
| worker-cross-project.test.ts | 工人跨项目 | +1% |
| project-health.test.ts | 项目健康度 | +1% |
| settlement-verification.test.ts | 结算核验 | +1% |
| ocr-identity.test.ts | OCR 识别 | +0.5% |
| data-integrity.test.ts | 数据完整性 | +1.5% |

**预计总覆盖率**：15.48% + 20% = **35.48%** ✅

---

## 🚀 执行计划

### 第一阶段（P0 风险）：
1. 成本台账双写一致性测试
2. 工资源码计算准确性测试
3. SQLite 数据迁移完整性测试
4. 数据完整性校验测试

### 第二阶段（P1 风险）：
5. 发票状态自动更新测试
6. IPC 权限守卫测试
7. 数据快照创建与恢复测试

### 第三阶段（P2 风险）：
8. Excel 导入数据校验测试
9. 考勤统计准确性测试
10. 合同状态统计准确性测试
11. SQLite 读取模式切换测试
12. 工人跨项目关联测试
13. 项目健康度计算测试
14. 结算办理核验逻辑测试

### 第四阶段（P3 风险）：
15. 身份证 OCR 识别准确性测试

---

## 📝 备注

- 所有测试文件应放在 `src/__tests__/critical/` 目录下
- 测试应使用真实的业务逻辑，避免过多 mock
- 每个测试用例应包含正面和负面测试
- 测试数据应使用独立的测试数据库，避免污染生产数据

---

**创建时间**：2026-05-23  
**创建者**：工程保障团队  
**审核状态**：待审核
