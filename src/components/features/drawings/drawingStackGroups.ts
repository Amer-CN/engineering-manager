// drawingStackGroups.ts — 图纸按类别派生 FolderStack3D 分组卡数据
// 语义红线：一张卡 = 一个类别分组，不是一行图纸（DESIGN.md § Stage Surfaces · 决策 4）
import type { Drawing } from '../../../types/electron'
import type { StackGroup } from '@/components/ui/FolderStack3D'
import { categories } from '../../drawingsConstants'

export function buildDrawingStackGroups(drawings: Drawing[]): StackGroup[] {
  const total = drawings.length
  if (total === 0) return []
  const byCat = new Map<string, Drawing[]>()
  for (const d of drawings) {
    const cat = d.category && categories.includes(d.category) ? d.category : '其他'
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
