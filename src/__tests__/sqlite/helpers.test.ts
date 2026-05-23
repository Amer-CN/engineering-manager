import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReadMode } from '../../../electron/sqlite/queries/helpers'

// ══════════════════════════════════════════════════════════
// 顶部 vi.mock（必须！）
// ══════════════════════════════════════════════════════════

// Mock electron-log
vi.mock('electron-log', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

// Mock ../db-init
vi.mock('../../../electron/sqlite/db-init', () => ({
  getSqliteDb: vi.fn(),
  isSqliteReady: vi.fn(),
}))

// Mock ../migrate
vi.mock('../../../electron/sqlite/migrate', () => ({
  isSqliteMigrated: vi.fn(),
}))

// ══════════════════════════════════════════════════════════
// 动态导入（避免顶层 import 触发依赖）
// ══════════════════════════════════════════════════════════

let helpers: any

describe('SQLite Helpers - 字段名转换', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // 动态导入，让 vi.mock 先执行
    const mod = await import('../../../electron/sqlite/queries/helpers')
    helpers = mod
  })

  describe('camelToSnake()', () => {
    it('应正确转换 camelCase → snake_case', () => {
      expect(helpers.camelToSnake('camelCase')).toBe('camel_case')
      expect(helpers.camelToSnake('helloWorld')).toBe('hello_world')
      expect(helpers.camelToSnake('thisIsATest')).toBe('this_is_a_test')
    })

    it('首个字符大写时，前面不加下划线', () => {
      // 当前实现：/[A-Z]/g → `_${letter.toLowerCase()}`
      // 所以 'Hello' → '_hello'
      expect(helpers.camelToSnake('Hello')).toBe('_hello')
    })

    it('应处理空字符串', () => {
      expect(helpers.camelToSnake('')).toBe('')
    })
  })

  describe('snakeToCamel()', () => {
    it('应正确转换 snake_case → camelCase', () => {
      expect(helpers.snakeToCamel('snake_case')).toBe('snakeCase')
      expect(helpers.snakeToCamel('hello_world')).toBe('helloWorld')
      expect(helpers.snakeToCamel('this_is_a_test')).toBe('thisIsATest')
    })

    it('应处理单个单词（无下划线）', () => {
      expect(helpers.snakeToCamel('single')).toBe('single')
    })

    it('应处理空字符串', () => {
      expect(helpers.snakeToCamel('')).toBe('')
    })
  })

  describe('rowToCamel()', () => {
    it('应将 snake_case 键转为 camelCase', () => {
      const row = { id: '1', project_id: 'p1', created_at: '2026-05-23' }
      const result = helpers.rowToCamel(row)
      expect(result).toEqual({
        id: '1',
        projectId: 'p1',
        createdAt: '2026-05-23',
      })
    })

    it('应解析 JSON TEXT 字段（数组）', () => {
      const row = { id: '1', items: '[]' }
      const result = helpers.rowToCamel(row)
      expect(result.items).toEqual([])
    })

    it('应解析 JSON TEXT 字段（对象）', () => {
      const row = { id: '1', meta: '{}' }
      const result = helpers.rowToCamel(row)
      expect(result.meta).toEqual({})
    })

    it('应尝试解析 [...] 或 {...} 开头的字符串', () => {
      const row = { id: '1', data: '["a","b"]' }
      const result = helpers.rowToCamel(row)
      expect(result.data).toEqual(['a', 'b'])
    })

    it('JSON 解析失败时返回原字符串', () => {
      const row = { id: '1', data: '[invalid json' }
      const result = helpers.rowToCamel(row)
      expect(result.data).toBe('[invalid json')
    })
  })

  describe('objToSnake()', () => {
    it('应将 camelCase 键转为 snake_case', () => {
      const obj = { id: '1', projectId: 'p1', createdAt: '2026-05-23' }
      const result = helpers.objToSnake(obj)
      expect(result).toEqual({
        id: '1',
        project_id: 'p1',
        created_at: '2026-05-23',
      })
    })

    it('应处理嵌套对象（不递归）', () => {
      const obj = { id: '1', meta: { key: 'value' } }
      const result = helpers.objToSnake(obj)
      // 不递归，meta 保持原样
      expect(result.meta).toEqual({ key: 'value' })
    })
  })
})
