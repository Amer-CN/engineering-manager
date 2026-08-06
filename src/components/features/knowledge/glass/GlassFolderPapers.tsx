/**
 * GlassFolderPapers — 文件夹内部纸张（三张阶梯纸）
 *
 * 常态：三张纸收拢在袋内（translate3d 0/16-20px）；选中：扇形展开——
 * (-8,-24,3)∠-4°、(8,-16,6)∠3.5°、(0,-6,9)∠-0.5°（参考项目真值）。
 * 折角边框与底色走 glassCarousel.css（.gc-paper--N），transform 随 isActive 内联切换。
 */

import React from 'react'
import { FileText } from 'lucide-react'
import type { DocumentItem } from './types'

interface GlassFolderPapersProps {
  docs: DocumentItem[]
  isActive: boolean
}

/** 扇形展开（选中）/ 收拢（常态）transform 真值，顺序 = 后→前 */
const FAN_OUT = [
  'translate3d(-8px, -24px, 3px) rotate(-4deg)',
  'translate3d(8px, -16px, 6px) rotate(3.5deg)',
  'translate3d(0px, -6px, 9px) rotate(-0.5deg)',
]
const FAN_IN = [
  'translate3d(0px, 16px, 3px) rotate(0deg)',
  'translate3d(0px, 18px, 6px) rotate(0deg)',
  'translate3d(0px, 20px, 9px) rotate(0deg)',
]

const FALLBACK_DOCS: Array<Pick<DocumentItem, 'code' | 'title' | 'priority'>> = [
  { code: 'DOC-01', title: '资料索引与归档说明', priority: '高' },
  { code: 'DOC-02', title: '目录与版本记录', priority: '中' },
  { code: 'DOC-03', title: '历史归档记录', priority: '低' },
]

/** 纸面占位线宽（视觉层级，非数据） */
const LINE_GROUPS = [
  ['100%', '66%', '80%'],
  ['100%', '75%'],
]

const PaperSkeleton: React.FC<{ widths: string[] }> = ({ widths }) => (
  <div className="space-y-1.5 opacity-50">
    {widths.map((w, i) => (
      <div key={i} className="h-1 bg-slate-400 rounded" style={{ width: w }} />
    ))}
  </div>
)

export const GlassFolderPapers: React.FC<GlassFolderPapersProps> = ({ docs, isActive }) => {
  return (
    <div className="gc-papers">
      {FAN_OUT.map((_, i) => {
        const doc = docs[i] ?? FALLBACK_DOCS[i]
        const isHigh = doc.priority === '高'
        return (
          <div
            key={i}
            className={`gc-paper gc-paper--${i + 1}`}
            style={{ transform: isActive ? FAN_OUT[i] : FAN_IN[i] }}
          >
            <div>
              {/* 顶部分类条：编号 + 优先级 */}
              <div className="flex items-center justify-between border-b border-slate-300 pb-1">
                <span className="flex items-center gap-1 text-caption font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                  {i === 0 && <FileText className="w-3.5 h-3.5 text-emerald-600" />}
                  {doc.code}
                </span>
                <span
                  className={`text-caption font-extrabold px-1.5 py-0.5 rounded border ${
                    isHigh
                      ? 'bg-red-100 text-red-700 border-red-200'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {doc.priority}优先级
                </span>
              </div>

              <div className="text-caption font-extrabold truncate text-slate-900 my-1">
                {doc.title}
              </div>

              {/* 前两张纸带负责人/状态行（最前纸 emerald 状态、中间纸 amber 状态） */}
              {i <= 1 && (
                <div
                  className={`flex items-center justify-between text-micro bg-slate-50 p-1 rounded border border-slate-200 mt-2 ${
                    i === 0 ? 'p-1.5' : ''
                  }`}
                >
                  <span className="text-slate-700 font-bold truncate">负责人: {doc.assignee}</span>
                  <span className={i === 0 ? 'text-emerald-600 font-extrabold' : 'text-amber-700 font-bold'}>
                    {doc.status}
                  </span>
                </div>
              )}
            </div>

            <div>
              <PaperSkeleton widths={LINE_GROUPS[0]} />
              <div className="pb-2">
                <PaperSkeleton widths={LINE_GROUPS[1]} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
