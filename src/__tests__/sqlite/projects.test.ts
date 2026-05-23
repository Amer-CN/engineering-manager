import { describe, it, expect, vi, beforeEach } from 'vitest'

// ══════════════════════════════════════════════════════
// 顶部 vi.mock（必须！）
// ══════════════════════════════════════════════════════

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

// ══════════════════════════════════════════════════════
// 动态导入
// ══════════════════════════════════════════════════════

let projectQueries: any
let mockDb: any
let mockStmt: any
let mockTransaction: any
let helpers: any

describe('Projects SQLite Queries', () => {
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
    projectQueries = await import('../../../electron/sqlite/queries/projects')
  })

  describe('listProjects()', () => {
    it('应返回项目数组', () => {
      const mockRows = [
        { id: 'p1', name: '项目1', status: 'active' },
        { id: 'p2', name: '项目2', status: 'completed' },
      ]
      mockStmt.all.mockReturnValue(mockRows)

      const result = projectQueries.listProjects()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(2)
    })

    it('SQLite 未就绪时，应返回 null', async () => {
      helpers.tryGetSqlite.mockReturnValue(null)

      const result = projectQueries.listProjects()

      expect(result).toBeNull()
    })
  })

  describe('createProject()', () => {
    it('应插入记录并返回 true', () => {
      const project = {
        id: 'p1',
        name: '测试项目',
        status: 'active',
        startDate: '2026-05-23',
      }

      const result = projectQueries.createProject(project)

      expect(mockStmt.run).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('插入失败时应返回 false', () => {
      // 让 sqlite.prepare().run 抛出异常
      mockStmt.run.mockImplementation(() => {
        throw new Error('SQLite error')
      })

      const project = { id: 'p1', name: '测试项目' }

      const result = projectQueries.createProject(project)

      expect(result).toBe(false)
    })
  })

  describe('updateProject()', () => {
    it('应更新记录并返回 true', () => {
      const project = {
        id: 'p1',
        name: '更新后的项目名',
        status: 'completed',
      }

      const result = projectQueries.updateProject(project)

      expect(mockStmt.run).toHaveBeenCalled()
      expect(result).toBe(true)
    })

    it('记录不存在时应返回 false', () => {
      mockStmt.run.mockReturnValue({ changes: 0 })

      const project = { id: 'non-existent', name: '测试' }

      const result = projectQueries.updateProject(project)

      expect(result).toBe(false)
    })
  })

  describe('deleteProject()', () => {
    it('应删除记录并返回 true', () => {
      const result = projectQueries.deleteProject('p1')

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

      const result = projectQueries.deleteProject('p1')

      expect(result).toBe(false)
    })
  })
})
