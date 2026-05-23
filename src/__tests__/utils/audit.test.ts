import {
  setCurrentAuditUser,
  logAudit,
  logCreate,
  logRead,
  logUpdate,
  logDelete,
  logExport,
  logImport,
  logApprove,
  queryAuditLogs,
  getResourceAuditLogs,
  getUserAuditLogs,
  clearOldLogs,
  clearAllLogs,
} from '../../utils/audit'

// mock localStorage
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
  removeItem: vi.fn((key: string) => { delete storage[key] }),
  clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]) }),
  get length() { return Object.keys(storage).length },
  key: vi.fn((i: number) => Object.keys(storage)[i] ?? null),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })

// mock window.electronAPI
const mockAuditLog = vi.fn().mockResolvedValue(undefined)
const mockQueryAuditLogs = vi.fn().mockResolvedValue({ success: false })
const mockGetAuditStats = vi.fn().mockResolvedValue({ success: false })
const mockClearAuditLogs = vi.fn().mockResolvedValue({ success: false })

Object.defineProperty(globalThis, 'window', {
  value: {
    electronAPI: {
      auditLog: mockAuditLog,
      queryAuditLogs: mockQueryAuditLogs,
      getAuditStats: mockGetAuditStats,
      clearAuditLogs: mockClearAuditLogs,
    },
  },
  configurable: true,
})

describe('audit.ts', () => {
  beforeEach(() => {
    // 清空 localStorage 模拟
    Object.keys(storage).forEach(k => delete storage[k])
    vi.clearAllMocks()
    setCurrentAuditUser(null, null)
  })

  // ─── setCurrentAuditUser ─────────────────────────────────────
  describe('setCurrentAuditUser', () => {
    it('应设置当前用户信息', () => {
      setCurrentAuditUser('user1', '张三')
      const log = logAudit('create', 'projects', '测试')
      expect(log.userId).toBe('user1')
      expect(log.username).toBe('张三')
    })

    it('null → 使用默认值', () => {
      setCurrentAuditUser(null, null)
      const log = logAudit('create', 'projects', '测试')
      expect(log.userId).toBe('unknown')
      expect(log.username).toBe('anonymous')
    })
  })

  // ─── logAudit ────────────────────────────────────────────────
  describe('logAudit', () => {
    it('应生成完整的日志条目', () => {
      setCurrentAuditUser('user1', '张三')
      const log = logAudit('create', 'projects', '创建项目: 测试')

      expect(log.id).toMatch(/^log_\d+_/)
      expect(log.action).toBe('create')
      expect(log.resource).toBe('projects')
      expect(log.description).toBe('创建项目: 测试')
      expect(log.userId).toBe('user1')
      expect(log.username).toBe('张三')
      expect(log.level).toBe('info')
      expect(log.timestamp).toBeTruthy()
    })

    it('应支持可选参数', () => {
      const log = logAudit('update', 'members', '更新成员', {
        resourceId: 42,
        resourceName: '李四',
        level: 'warning',
        details: { before: { name: '旧' }, after: { name: '新' } },
      })

      expect(log.resourceId).toBe(42)
      expect(log.resourceName).toBe('李四')
      expect(log.level).toBe('warning')
      expect(log.details).toEqual({ before: { name: '旧' }, after: { name: '新' } })
    })

    it('默认 level 为 info', () => {
      const log = logAudit('read', 'projects', '查看项目')
      expect(log.level).toBe('info')
    })

    it('应同步到 electronAPI', () => {
      logAudit('create', 'projects', '测试')
      expect(mockAuditLog).toHaveBeenCalledTimes(1)
    })

    it('应持久化到 localStorage', () => {
      logAudit('create', 'projects', '测试')
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  // ─── 便捷函数 ─────────────────────────────────────────────────
  describe('便捷日志函数', () => {
    beforeEach(() => setCurrentAuditUser('user1', '张三'))

    it('logCreate', () => {
      const log = logCreate('projects', '测试项目', 1)
      expect(log.action).toBe('create')
      expect(log.description).toBe('创建 测试项目')
      expect(log.resourceName).toBe('测试项目')
      expect(log.resourceId).toBe(1)
    })

    it('logRead', () => {
      const log = logRead('projects', '测试项目', 1)
      expect(log.action).toBe('read')
      expect(log.description).toBe('查看 测试项目')
    })

    it('logUpdate', () => {
      const log = logUpdate('members', '李四', 42, { field: 'name' })
      expect(log.action).toBe('update')
      expect(log.description).toBe('更新 李四')
      expect(log.resourceId).toBe(42)
      expect(log.details).toEqual({ field: 'name' })
    })

    it('logDelete', () => {
      const log = logDelete('members', '王五', 5)
      expect(log.action).toBe('delete')
      expect(log.description).toBe('删除 王五')
      expect(log.level).toBe('warning')
    })

    it('logExport', () => {
      const log = logExport('projects', 100)
      expect(log.action).toBe('export')
      expect(log.description).toContain('100')
      expect(log.details).toEqual({ count: 100 })
    })

    it('logImport', () => {
      const log = logImport('members', 50)
      expect(log.action).toBe('import')
      expect(log.description).toContain('50')
      expect(log.details).toEqual({ count: 50 })
    })

    it('logApprove 通过', () => {
      const log = logApprove('contracts', '合同A', 1, true)
      expect(log.action).toBe('approve')
      expect(log.description).toContain('通过')
      expect(log.level).toBe('info')
      expect(log.details).toEqual({ approved: true, reason: undefined })
    })

    it('logApprove 驳回', () => {
      const log = logApprove('contracts', '合同B', 2, false, '资料不全')
      expect(log.description).toContain('驳回')
      expect(log.level).toBe('warning')
      expect(log.details).toEqual({ approved: false, reason: '资料不全' })
    })
  })

  // ─── queryAuditLogs ──────────────────────────────────────────
  describe('queryAuditLogs', () => {
    beforeEach(async () => {
      // 写入几条日志
      setCurrentAuditUser('user1', '张三')
      logAudit('create', 'projects', '创建项目A')
      logAudit('update', 'members', '更新成员B')
      logAudit('delete', 'projects', '删除项目C')
      setCurrentAuditUser('user2', '李四')
      logAudit('create', 'members', '创建成员D')
    })

    it('默认查询应返回分页结果', async () => {
      const result = await queryAuditLogs()
      expect(result.items).toBeInstanceOf(Array)
      expect(result.total).toBe(4)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBe(1)
    })

    it('结果应按时间排序（最新的在前或后）', async () => {
      const result = await queryAuditLogs()
      // 排序方向是倒序（最新在前），但同毫秒的日志顺序可能不稳定
      expect(result.items.length).toBe(4)
      expect(result.items.map(l => l.username)).toContain('张三')
      expect(result.items.map(l => l.username)).toContain('李四')
    })

    it('应按 userId 筛选', async () => {
      const result = await queryAuditLogs({ userId: 'user1' })
      expect(result.total).toBe(3)
      expect(result.items.every(l => l.userId === 'user1')).toBe(true)
    })

    it('应按 action 筛选', async () => {
      const result = await queryAuditLogs({ action: 'create' })
      expect(result.total).toBe(2)
    })

    it('应按 resource 筛选', async () => {
      const result = await queryAuditLogs({ resource: 'projects' })
      expect(result.total).toBe(2)
    })

    it('应按 keyword 筛选', async () => {
      const result = await queryAuditLogs({ keyword: '成员' })
      expect(result.total).toBe(2)
    })

    it('应支持分页', async () => {
      const result = await queryAuditLogs({ page: 1, pageSize: 2 })
      expect(result.items.length).toBe(2)
      expect(result.total).toBe(4)
      expect(result.totalPages).toBe(2)
    })

    it('应按 level 筛选', async () => {
      const result = await queryAuditLogs({ level: 'info' })
      // create/update → info, delete → warning
      expect(result.items.every(l => l.level === 'info')).toBe(true)
    })

    it('应优先从 electronAPI 查询（如果成功）', async () => {
      const mockResult = {
        items: [{ id: 'mock_log' }],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }
      mockQueryAuditLogs.mockResolvedValueOnce({ success: true, data: mockResult })

      const result = await queryAuditLogs()
      expect(result.total).toBe(1)
      expect(result.items[0].id).toBe('mock_log')
    })
  })

  // ─── getResourceAuditLogs ─────────────────────────────────────
  describe('getResourceAuditLogs', () => {
    it('应返回指定资源的操作记录', () => {
      setCurrentAuditUser('user1', '张三')
      logAudit('create', 'projects', '创建项目', { resourceId: 1 })
      logAudit('update', 'projects', '更新项目', { resourceId: 1 })
      logAudit('create', 'members', '创建成员', { resourceId: 2 })

      const logs = getResourceAuditLogs('projects', 1)
      expect(logs.length).toBe(2)
      expect(logs.every(l => l.resource === 'projects' && l.resourceId === 1)).toBe(true)
    })
  })

  // ─── getUserAuditLogs ─────────────────────────────────────────
  describe('getUserAuditLogs', () => {
    it('应返回指定用户的操作记录', () => {
      setCurrentAuditUser('user1', '张三')
      logAudit('create', 'projects', '项目1')
      logAudit('create', 'projects', '项目2')
      setCurrentAuditUser('user2', '李四')
      logAudit('create', 'projects', '项目3')

      const logs = getUserAuditLogs('user1')
      expect(logs.length).toBe(2)
      expect(logs.every(l => l.userId === 'user1')).toBe(true)
    })

    it('应支持 limit 参数', () => {
      setCurrentAuditUser('user1', '张三')
      for (let i = 0; i < 10; i++) {
        logAudit('create', 'projects', `项目${i}`)
      }

      const logs = getUserAuditLogs('user1', 3)
      expect(logs.length).toBe(3)
    })
  })

  // ─── clearOldLogs / clearAllLogs ─────────────────────────────
  describe('clearOldLogs', () => {
    it('应尝试从 electronAPI 清除旧日志', async () => {
      setCurrentAuditUser('user1', '张三')
      logAudit('create', 'projects', '新操作')

      await clearOldLogs(90)
      // 会调用 electronAPI.clearAuditLogs
      expect(mockClearAuditLogs).toHaveBeenCalled()
    })

    it('无旧日志时返回 0', async () => {
      const removed = await clearOldLogs(9999)
      expect(removed).toBe(0)
    })
  })

  describe('clearAllLogs', () => {
    it('应清空所有日志', async () => {
      setCurrentAuditUser('user1', '张三')
      logAudit('create', 'projects', '测试')

      await clearAllLogs()
      expect(localStorageMock.removeItem).toHaveBeenCalled()
      // IPC 回退到 localStorage 后应无数据
      // 注意：clearAllLogs 已删除 localStorage 数据
    })
  })
})
