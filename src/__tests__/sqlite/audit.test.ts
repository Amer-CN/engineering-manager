import { describe, it, expect, vi, beforeEach } from 'vitest'

// ════════════════════════════════════════════════════════
// 顶部 vi.mock（必须！）
// ════════════════════════════════════════════════════════

// Mock electron-log
vi.mock('electron-log', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Mock ./helpers
vi.mock('../../../electron/sqlite/queries/helpers', () => ({
  tryGetSqlite: vi.fn(),
  rowToCamel: vi.fn((row) => row),
  toSqliteValue: vi.fn((val) => val),
  useSqliteRead: vi.fn(),
}))

// ════════════════════════════════════════════════════════
// 动态导入
// ════════════════════════════════════════════════════════

let auditQueries: any
let mockDb: any
let mockStmt: any
let helpers: any

describe('Audit SQLite Queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // 创建 mock 语句
    mockStmt = {
      run: vi.fn().mockReturnValue({ changes: 1 }),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      iterate: vi.fn(),
    }

    // 创建 mock 数据库
    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStmt),
    }

    // 设置 helpers mock
    helpers = await import('../../../electron/sqlite/queries/helpers')
    helpers.tryGetSqlite.mockReturnValue(mockDb)
    helpers.useSqliteRead.mockReturnValue(true)

    // 动态导入被测模块
    auditQueries = await import('../../../electron/sqlite/queries/audit')
  })

  describe('logAudit()', () => {
    it('应写入审计日志并返回 true', () => {
      const auditLog = {
        id: 'log_001',
        timestamp: '2026-05-23T10:00:00.000Z',
        userId: 'user1',
        username: '管理员',
        action: 'create',
        resource: 'project',
        resourceId: 'p1',
        description: '创建了项目',
        ip: '127.0.0.1',
      }

      const result = auditQueries.logAudit(auditLog)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO audit_logs')
      )
      expect(mockStmt.run).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('SQLite 未就绪时，应返回 false', async () => {
      helpers.tryGetSqlite.mockReturnValue(null)

      const auditLog = { id: 'log_001' }
      const result = auditQueries.logAudit(auditLog)

      expect(result).toBe(false)
    })

    it('写入失败时应返回 false', () => {
      mockStmt.run.mockImplementation(() => {
        throw new Error('SQLite error')
      })

      const auditLog = { id: 'log_001' }
      const result = auditQueries.logAudit(auditLog)

      expect(result).toBe(false)
    })
  })

  describe('clearLogs()', () => {
    it('应删除指定天数之前的日志，并返回删除行数', () => {
      mockStmt.run.mockReturnValue({ changes: 5 })

      const result = auditQueries.clearLogs(30)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM audit_logs')
      )
      expect(mockStmt.run).toHaveBeenCalled()
      expect(result).toBe(5)
    })

    it('SQLite 未就绪时，应返回 0', () => {
      helpers.tryGetSqlite.mockReturnValue(null)

      const result = auditQueries.clearLogs(30)

      expect(result).toBe(0)
    })
  })

  describe('queryLogs()', () => {
    it('应返回分页结果', () => {
      // 模拟 COUNT 查询
      mockStmt.get.mockReturnValueOnce({ count: 25 })
      // 模拟数据查询
      mockStmt.all.mockReturnValueOnce([
        { id: 'log_001', action: 'create', user_name: 'admin' },
        { id: 'log_002', action: 'update', user_name: 'admin' },
      ])

      const result = auditQueries.queryLogs({ page: 1, pageSize: 10 })

      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('totalPages')
      expect(result.items).toHaveLength(2)
    })

    it('应支持日期筛选', () => {
      mockStmt.get.mockReturnValue({ count: 0 })
      mockStmt.all.mockReturnValue([])

      auditQueries.queryLogs({
        startDate: '2026-05-01',
        endDate: '2026-05-31',
      })

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE')
      )
    })

    it('应支持关键词搜索', () => {
      mockStmt.get.mockReturnValue({ count: 0 })
      mockStmt.all.mockReturnValue([])

      auditQueries.queryLogs({ keyword: '项目' })

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('LIKE')
      )
    })

    it('SQLite 未就绪时，应返回 null', () => {
      helpers.useSqliteRead.mockReturnValue(false)

      const result = auditQueries.queryLogs({})

      expect(result).toBeNull()
    })
  })

  describe('getStats()', () => {
    it('应返回统计对象', () => {
      // 模拟各种查询
      mockStmt.get
        .mockReturnValueOnce({ count: 100 }) // totalCount
        .mockReturnValueOnce({ count: 10 })  // todayCount
      mockStmt.all
        .mockReturnValueOnce([{ action: 'create', count: 50 }]) // actionCounts
        .mockReturnValueOnce([{ resource_type: 'project', count: 30 }]) // resourceCounts
        .mockReturnValueOnce([{ user_name: 'admin', count: 20 }]) // topUsers

      const result = auditQueries.getStats()

      expect(result).toHaveProperty('totalCount')
      expect(result).toHaveProperty('todayCount')
      expect(result).toHaveProperty('actionCounts')
      expect(result).toHaveProperty('resourceCounts')
      expect(result).toHaveProperty('topUsers')
    })

    it('应支持天数筛选', () => {
      mockStmt.get.mockReturnValue({ count: 0 })
      mockStmt.all.mockReturnValue([])

      auditQueries.getStats(7)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE')
      )
    })

    it('SQLite 未就绪时，应返回 null', () => {
      helpers.useSqliteRead.mockReturnValue(false)

      const result = auditQueries.getStats()

      expect(result).toBeNull()
    })
  })
})
