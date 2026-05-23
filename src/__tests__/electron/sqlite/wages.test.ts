// @vitest-environment node
/**
 * wages.ts SQLite 查询模块测试
 *
 * 测试 electron/sqlite/queries/wages.ts 的 CRUD 和统计函数
 */

// ════════════════════════════════════════════════════════════════
// Mock better-sqlite3
// ════════════════════════════════════════════════════════════════

const mockDb = {
  prepare: vi.fn().mockReturnThis(),
  run: vi.fn(),
  get: vi.fn(),
  all: vi.fn(),
  transaction: vi.fn((fn) => fn),
}

vi.mock('better-sqlite3', () => ({
  default: vi.fn(() => mockDb),
}))

// ════════════════════════════════════════════════════════════════
// Mock electron
// ════════════════════════════════════════════════════════════════

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn().mockReturnValue('/fake/userData'),
  },
}))

// ════════════════════════════════════════════════════════════════
// Mock electron-log
// ════════════════════════════════════════════════════════════════

vi.mock('electron-log', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

// ════════════════════════════════════════════════════════════════
// Mock helpers
// ════════════════════════════════════════════════════════════════

function camelize(obj: Record<string, any>): Record<string, any> {
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    const ck = k.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())
    r[ck] = v
  }
  return r
}

vi.mock('../../../../electron/sqlite/queries/helpers.js', () => ({
  tryGetSqlite: vi.fn(() => mockDb),
  rowToCamel: vi.fn((row: any) => camelize(row)),
  toSqliteValue: vi.fn((val: any) => val),
}))

// ════════════════════════════════════════════════════════════════
// 导入被测函数（必须在 mock 之后）
// ════════════════════════════════════════════════════════════════

const { listWages, createWage, updateWage, deleteWage, batchDeleteWages, batchSaveWages, batchClearPayments, batchArchivePayments, getPaymentRecords, getOverdueStats, getOverdueList, getWageStats } = await import('../../../../electron/sqlite/queries/wages.ts')

// ════════════════════════════════════════════════════════════════
// 测试工具函数
// ════════════════════════════════════════════════════════════════

function resetMocks() {
  mockDb.prepare.mockClear()
  mockDb.run.mockClear()
  mockDb.get.mockClear()
  mockDb.all.mockClear()
  mockDb.transaction.mockClear()
}

// ════════════════════════════════════════════════════════════════
// 测试用例
// ════════════════════════════════════════════════════════════════

describe('wages.ts SQLite 查询模块', () => {
  beforeEach(() => {
    resetMocks()
    // 默认：prepare() 返回 mockDb（支持链式调用）
    mockDb.prepare.mockReturnValue(mockDb)
    // 默认：run() 返回 { changes: 1 }
    mockDb.run.mockReturnValue({ changes: 1 })
    // 默认：get() 返回 null
    mockDb.get.mockReturnValue(null)
    // 默认：all() 返回空数组
    mockDb.all.mockReturnValue([])
  })

  // ─── listWages ─────────────────────────────────────────────
  describe('listWages', () => {
    it('无过滤条件时应返回所有工资记录', () => {
      const fakeRows = [
        { id: 1, project_id: 1, year_month: '2026-04', actual_wage: 5000 },
        { id: 2, project_id: 1, year_month: '2026-04', actual_wage: 6000 },
      ]
      mockDb.all.mockReturnValue(fakeRows)

      const result = listWages()

      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT * FROM wages'))
      expect(result).toHaveLength(2)
    })

    it('按 projectId 过滤', () => {
      mockDb.all.mockReturnValue([])

      listWages({ projectId: 5 })

      const sql = mockDb.prepare.mock.calls[0][0]
      expect(sql).toContain('project_id = ?')
    })

    it('按 yearMonth 过滤', () => {
      mockDb.all.mockReturnValue([])

      listWages({ yearMonth: '2026-04' })

      const sql = mockDb.prepare.mock.calls[0][0]
      expect(sql).toContain('year_month = ?')
    })

    it('SQLite 未就绪时应返回空数组', async () => {
      const { tryGetSqlite } = await import('../../../../electron/sqlite/queries/helpers.js')
      tryGetSqlite.mockReturnValueOnce(null)

      const result = listWages()
      expect(result).toEqual([])
    })
  })

  // ─── createWage ────────────────────────────────────────────
  describe('createWage', () => {
    it('应成功插入工资记录', () => {
      const record = {
        projectId: 1,
        memberId: 10,
        yearMonth: '2026-04',
        dailyWage: 200,
        workDays: 22,
        bonus: 0,
        deduction: 0,
        actualWage: 4400,
      }

      const result = createWage(record)

      expect(result).toBe(true)
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO wages'))
    })

    it('SQLite 未就绪时应返回 false', async () => {
      const { tryGetSqlite } = await import('../../../../electron/sqlite/queries/helpers.js')
      tryGetSqlite.mockReturnValueOnce(null)

      const result = createWage({ projectId: 1, yearMonth: '2026-04' })
      expect(result).toBe(false)
    })
  })

  // ─── updateWage ────────────────────────────────────────────
  describe('updateWage', () => {
    it('应成功更新工资记录', () => {
      mockDb.run.mockReturnValue({ changes: 1 })

      const result = updateWage(1, { paidAmount: 4400, paidDate: '2026-04-30' })

      expect(result).toBe(true)
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE wages SET'))
    })

    it('记录不存在（changes=0）时应返回 false', () => {
      mockDb.run.mockReturnValue({ changes: 0 })

      const result = updateWage(999, { paidAmount: 100 })
      expect(result).toBe(false)
    })
  })

  // ─── deleteWage ────────────────────────────────────────────
  describe('deleteWage', () => {
    it('应成功删除工资记录', () => {
      mockDb.run.mockReturnValue({ changes: 1 })

      const result = deleteWage(1)

      expect(result).toBe(true)
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM wages WHERE id = ?'))
    })

    it('记录不存在时应返回 false', () => {
      mockDb.run.mockReturnValue({ changes: 0 })

      const result = deleteWage(999)
      expect(result).toBe(false)
    })
  })

  // ─── batchDeleteWages ──────────────────────────────────────
  describe('batchDeleteWages', () => {
    it('应批量删除工资记录', () => {
      const result = batchDeleteWages([1, 2, 3])

      expect(result).toBe(true)
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM wages WHERE id IN'))
    })

    it('空数组时应直接返回 true', () => {
      const result = batchDeleteWages([])
      expect(result).toBe(true)
    })
  })

  // ─── batchSaveWages ────────────────────────────────────────
  describe('batchSaveWages', () => {
    it('应事务删除旧记录并插入新记录', () => {
      const records = [
        { projectId: 1, yearMonth: '2026-04', memberId: 1, dailyWage: 200, workDays: 22, actualWage: 4400 },
        { projectId: 1, yearMonth: '2026-04', memberId: 2, dailyWage: 200, workDays: 20, actualWage: 4000 },
      ]

      const result = batchSaveWages(records)

      expect(result).toBe(true)
      // 应调用 DELETE
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM wages'))
    })

    it('空数组时应直接返回 true', () => {
      const result = batchSaveWages([])
      expect(result).toBe(true)
    })
  })

  // ─── batchClearPayments ────────────────────────────────────
  describe('batchClearPayments', () => {
    it('应批量清空发放字段', () => {
      const result = batchClearPayments([1, 2])

      expect(result).toBe(true)
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE wages SET paid_amount = 0'))
    })
  })

  // ─── batchArchivePayments ─────────────────────────────────
  describe('batchArchivePayments', () => {
    it('应批量归档工资发放记录', () => {
      const result = batchArchivePayments([1, 2])

      expect(result).toBe(true)
      expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE wages SET payment_locked = 1'))
    })
  })

  // ─── getPaymentRecords ─────────────────────────────────────
  describe('getPaymentRecords', () => {
    it('应联表查询并返回工资发放记录', () => {
      mockDb.all.mockReturnValue([
        {
          id: 1,
          year_month: '2026-04',
          actual_wage: 4400,
          paid_amount: 0,
          w_member_name: '张三',
          worker_name: '',
          worker_phone: '',
          project_name: '测试项目',
        },
      ])

      const result = getPaymentRecords()

      expect(result).toHaveLength(1)
      expect(result[0].workerName).toBe('张三')
    })

    it('已发清的记录应标记「已发清」', () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      // 构造一个已发清的记录（paidAmount >= actualWage）
      mockDb.all.mockReturnValue([
        {
          id: 1,
          year_month: '2026-01', // 久远月份，一定逾期
          actual_wage: 4400,
          paid_amount: 4400,
          w_member_name: '李四',
          worker_name: '',
          worker_phone: '',
          project_name: '项目A',
        },
      ])

      const result = getPaymentRecords()
      expect(result[0].paymentStatus).toBe('已发清')
    })
  })

  // ─── getWageStats ──────────────────────────────────────────
  describe('getWageStats', () => {
    it('应返回工资统计（总额 + 按项目分组）', () => {
      // mock summary 查询
      mockDb.get.mockReturnValue({ total_wage: 10000, cnt: 3 })
      // mock breakdown 查询
      mockDb.all.mockReturnValue([
        { project_id: 1, project_name: '项目A', total: 6000 },
        { project_id: 2, project_name: '项目B', total: 4000 },
      ])

      const result = getWageStats()

      expect(result).not.toBeNull()
      expect(result!.totalWage).toBe(10000)
      expect(result!.count).toBe(3)
      expect(result!.projectBreakdown).toHaveLength(2)
    })

    it('无工资记录时总额应为 0', () => {
      mockDb.get.mockReturnValue({ total_wage: 0, cnt: 0 })
      mockDb.all.mockReturnValue([])

      const result = getWageStats()

      expect(result!.totalWage).toBe(0)
      expect(result!.count).toBe(0)
    })
  })
})
