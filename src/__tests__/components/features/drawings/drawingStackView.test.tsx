/**
 * 图纸堆叠视图数据层测试
 * - buildDrawingStackGroups：类别分组派生（计数/项目数/最新日期/占比/未知类别归其他）
 * - useDrawingsView：默认列表（Stage-Surface 红线）+ localStorage 持久化
 */
import { renderHook, act } from '@testing-library/react'
import type { Drawing } from '@/types/electron'
import { buildDrawingStackGroups } from '@/components/features/drawings/drawingStackGroups'
import { useDrawingsView } from '@/components/features/drawings/useDrawingsView'

const d = (id: number, category: string, projectId: number, createdAt: string): Drawing =>
  ({ id, name: `图${id}`, category, projectId, createdAt, filePath: `${id}.png`, remarks: '', position: '' } as Drawing)

describe('buildDrawingStackGroups', () => {
  it('按类别分组：计数 / 项目数 / 最新日期 / 占比', () => {
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
  })

  it('空数据返回空数组', () => {
    expect(buildDrawingStackGroups([])).toEqual([])
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
