import { describe, it, expect, vi, beforeEach } from 'vitest'

// ══════════════════════════════════════════════════
// 顶部 vi.mock（必须！）
// ══════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════
// 动态导入
// ══════════════════════════════════════════════════

let workerQueries: any
let mockDb: any
let mockStmt: any
let mockTransaction: any
let helpers: any

describe('Workers SQLite Queries', () => {
  beforeEach(async () => {
    vi.clearAllMocks()

    // 创建 mock 语句
    mockStmt = {
      run: vi.fn().mockReturnValue({ changes: 1 }),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      iterate: vi.fn(),
    }

    // 创建 mock 事务
    mockTransaction = vi.fn()

    // 创建 mock 数据库
    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStmt),
      transaction: vi.fn().mockReturnValue(mockTransaction),
    }

    // 设置 helpers mock
    helpers = await import('../../../electron/sqlite/queries/helpers')
    helpers.tryGetSqlite.mockReturnValue(mockDb)
    helpers.useSqliteRead.mockReturnValue(true)

    // 动态导入被测模块
    workerQueries = await import('../../../electron/sqlite/queries/workers')
  })

  describe('listWorkers()', () => {
    it('应返回工人数组', () => {
      const mockRows = [
        { id: 'w1', name: '张三', worker_type: 'manager' },
        { id: 'w2', name: '李四', worker_type: 'worker' },
      ]
      mockStmt.all.mockReturnValue(mockRows)

      const result = workerQueries.listWorkers()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('SQLite 未就绪时，应返回 null', async () => {
      helpers.tryGetSqlite.mockReturnValue(null)

      const result = workerQueries.listWorkers()

      expect(result).toBeNull()
    })

    it('应支持关键词搜索', () => {
      mockStmt.all.mockReturnValue([])

      workerQueries.listWorkers('张三')

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('WHERE')
      )
    })
  })

  describe('createWorker()', () => {
    it('应插入记录并返回 true', () => {
      const worker = {
        id: 'w1',
        name: '张三',
        workerType: 'worker',
        idCard: '510923199001011233',
      }

      const result = workerQueries.createWorker(worker)

      expect(mockStmt.run).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('插入失败时应返回 false', () => {
      // 让 sqlite.prepare().run 抛出异常
      mockStmt.run.mockImplementation(() => {
        throw new Error('SQLite error')
      })

      const worker = { id: 'w1', name: '张三' }

      const result = workerQueries.createWorker(worker)

      expect(result).toBe(false)
    })
  })

  describe('updateWorker()', () => {
    it('应更新记录并返回 true', () => {
      const changes = { name: '张三三', phone: '13800138000' }

      const result = workerQueries.updateWorker('w1', changes)

      expect(mockStmt.run).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('记录不存在时应返回 false', () => {
      mockStmt.run.mockReturnValue({ changes: 0 })

      const changes = { name: '张三' }

      const result = workerQueries.updateWorker('non-existent', changes)

      expect(result).toBe(false)
    })
  })

  describe('deleteWorker()', () => {
    it('应删除记录并返回 true', () => {
      const result = workerQueries.deleteWorker('w1')

      // 验证事务被调用
      expect(mockDb.transaction).toHaveBeenCalled()
      expect(mockTransaction).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('删除失败时应返回 false', () => {
      // 让事务抛出异常
      mockTransaction.mockImplementation(() => {
        throw new Error('SQLite error')
      })

      const result = workerQueries.deleteWorker('w1')

      expect(result).toBe(false)
    })
  })

  describe('existsByIdCard()', () => {
    it('身份证号存在时应返回 true', () => {
      mockStmt.get.mockReturnValue({ count: 1 })

      const result = workerQueries.existsByIdCard('510923199001011233')

      expect(result).toBe(true)
    })

    it('身份证号不存在时应返回 false', () => {
      mockStmt.get.mockReturnValue({ count: 0 })

      const result = workerQueries.existsByIdCard('510923199001011233')

      expect(result).toBe(false)
    })

    it('排除指定 ID 时应正常工作', () => {
      mockStmt.get.mockReturnValue({ count: 0 })

      const result = workerQueries.existsByIdCard('510923199001011233', 123)

      expect(result).toBe(false)
    })
  })
})
