// drawingStackGroups.ts — 图纸按类别派生轮播分组卡数据（M4 忠实度批：改接 GlassCarousel）
// 语义红线：一张卡 = 一个类别分组，不是一行图纸（DESIGN.md § Stage Surfaces · 决策 4）
import type { Drawing } from '../../../types/electron'
import { categories, normalizeDrawingCategory } from '../../drawingsConstants'

/** 卡数上限：超过强制回退扁平视图（消费方负责切换） */
export const STACK_GROUP_LIMIT = 40

export interface StackGroupStat {
  label: string
  value: string | number
}

export interface StackGroup {
  id: string | number
  name: string
  meta?: string
  badge?: { kind: 'people' | 'projects'; value: number }
  primaryValue: string | number
  primaryUnit?: string
  primaryLabel?: string
  stats?: StackGroupStat[]
  state?: { level: 'ok' | 'warn' | 'danger'; text: string }
  detail?: StackGroupStat[]
}

export function buildDrawingStackGroups(drawings: Drawing[]): StackGroup[] {
  const total = drawings.length
  if (total === 0) return []
  const byCat = new Map<string, Drawing[]>()
  for (const d of drawings) {
    // 与筛选/展示共用同一归一函数，保证卡面计数 = 打开后行数 = pill 筛「其他」口径
    const cat = normalizeDrawingCategory(d.category)
    const list = byCat.get(cat)
    if (list) list.push(d)
    else byCat.set(cat, [d])
  }
  // 按 categories 固定顺序输出，只出有图纸的类别（0 张的卡是噪音）
  return categories
    .filter(cat => byCat.has(cat))
    .map(cat => {
      const list = byCat.get(cat)!
      const projectCount = new Set(list.map(d => d.projectId).filter(Boolean)).size
      const latest = list.reduce((max, d) => {
        const t = (d.createdAt || '').slice(0, 10)
        return t > max ? t : max
      }, '')
      const share = `${Math.round((list.length / total) * 100)}%`
      return {
        id: cat,
        name: cat,
        meta: latest ? `${list.length} 张 · 最新 ${latest}` : `${list.length} 张`,
        badge: { kind: 'projects' as const, value: projectCount },
        primaryValue: list.length,
        primaryUnit: '张',
        primaryLabel: '图纸数量',
        stats: [
          { label: '项目', value: projectCount },
          { label: '占比', value: share },
        ],
        detail: [
          { label: '图纸数', value: list.length },
          { label: '覆盖项目', value: projectCount },
          { label: '最新上传', value: latest || '-' },
          { label: '全库占比', value: share },
        ],
      }
    })
}
