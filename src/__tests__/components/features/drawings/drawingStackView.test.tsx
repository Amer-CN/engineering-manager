/**
 * 图纸堆叠视图数据层测试
 * - buildDrawingStackGroups：类别分组派生（计数/项目数/最新日期/占比/未知类别归其他）
 * - useDrawingsView：默认列表（Stage-Surface 红线）+ localStorage 持久化
 */
import { renderHook, act } from '@testing-library/react'
import type { Drawing } from '@/types/electron'
import { buildDrawingStackGroups } from '@/components/features/drawings/drawingStackGroups'
import { useDrawingsView } from '@/components/features/drawings/useDrawingsView'
import { normalizeDrawingCategory } from '@/components/drawingsConstants'

const d = (id: number, category: string, projectId: number, createdAt: string): Drawing =>
  ({ id, name: `图${id}`, category, projectId, createdAt, filePath: `${id}.png`, remarks: '', position: '' } as Drawing)

describe('buildDrawingStackGroups', () => {
  it('按类别分组：计数 / 项目数 / 最新日期 / 占比 / projects badge', () => {
    const groups = buildDrawingStackGroups([
      d(1, '结构图', 1, '2026-07-01'),
      d(2, '结构图', 2, '2026-07-12'),
      d(3, '建筑图', 1, '2026-06-01'),
      d(4, '不存在的类别', 1, '2026-05-01'), // 归入「其他」
    ])
    // 按 categories 固定顺序：建筑图在结构图前，其他最后
    expect(groups.map(g => g.name)).toEqual(['建筑图', '结构图', '其他'])
    const struct = groups.find(g => g.name === '结构图')!
    expect(struct.primaryValue).toBe(2)
    expect(struct.meta).toBe('2 张 · 最新 2026-07-12')
    expect(struct.stats).toEqual([
      { label: '项目', value: 2 },
      { label: '占比', value: '50%' },
    ])
    expect(struct.detail).toContainEqual({ label: '最新上传', value: '2026-07-12' })
    // badge 接线真实 projectCount（结构图覆盖 2 个项目）
    expect(struct.badge).toEqual({ kind: 'projects', value: 2 })
    // 建筑图只覆盖 1 个项目
    const arch = groups.find(g => g.name === '建筑图')!
    expect(arch.badge).toEqual({ kind: 'projects', value: 1 })
  })

  it('空数据返回空数组', () => {
    expect(buildDrawingStackGroups([])).toEqual([])
  })
})

describe('normalizeDrawingCategory（B1 方案 C：全库唯一归一判定点）', () => {
  it('合法类别原样返回；脏值/空值归「其他」', () => {
    expect(normalizeDrawingCategory('结构图')).toBe('结构图')
    expect(normalizeDrawingCategory('其他')).toBe('其他')
    expect(normalizeDrawingCategory('结构')).toBe('其他')   // 脏值（旧数据/手输）
    expect(normalizeDrawingCategory('')).toBe('其他')
    expect(normalizeDrawingCategory(null)).toBe('其他')
    expect(normalizeDrawingCategory(undefined)).toBe('其他')
  })

  it('堆叠分组与筛选口径一致：脏类别图纸计入「其他」卡且能被同一归一筛出', () => {
    const rows = [
      d(1, '其他', 1, '2026-07-01'),      // 真「其他」类别
      d(2, '竖向不存在', 1, '2026-07-02'), // 脏类别
    ]
    const other = buildDrawingStackGroups(rows).find(g => g.name === '其他')!
    expect(other.primaryValue).toBe(2) // 混合桶计数 = 2
    // 打开卡后的筛选谓词（Drawings.tsx 同款逻辑）必须筛出同样 2 行
    const visible = rows.filter(r => normalizeDrawingCategory(r.category) === '其他')
    expect(visible).toHaveLength(2)
  })
})

describe('useDrawingsView', () => {
  beforeEach(() => localStorage.removeItem('drawings.view'))

  it('无持久化记录时默认列表视图（Stage-Surface 红线）', () => {
    const { result } = renderHook(() => useDrawingsView())
    expect(result.current.viewMode).toBe('list')
  })

  it('切换视图持久化到 localStorage 并可恢复', () => {
    const { result } = renderHook(() => useDrawingsView())
    act(() => result.current.setViewMode('stack'))
    expect(localStorage.getItem('drawings.view')).toBe('stack')
    const { result: restored } = renderHook(() => useDrawingsView())
    expect(restored.current.viewMode).toBe('stack')
  })

  it('localStorage 存了非法值时回落默认列表', () => {
    localStorage.setItem('drawings.view', 'bogus')
    const { result } = renderHook(() => useDrawingsView())
    expect(result.current.viewMode).toBe('list')
  })
})
