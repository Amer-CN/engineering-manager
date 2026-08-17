/**
 * GlassFolderPapers — 文件夹内部纸张（三张阶梯纸，差异化内容）
 *
 * 常态：三张纸收拢在袋内（translate3d 0/16-20px）；选中：扇形展开——
 * (-8,-24,3)∠-4°、(8,-16,6)∠3.5°、(0,-6,9)∠-0.5°（参考项目真值）。
 * 三张纸按参考项目差异化（忠实度修复）：
 *   纸 3（后）：emerald code 标签 + 灰优先级 pill
 *   纸 2（中）：amber code 标签 + amber 优先级 pill + amber 状态行
 *   纸 1（前）：FileText 图标 + code + 红/绿优先级 pill + emerald 状态行
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

const FALLBACK_DOCS: Array<Pick<DocumentItem, 'code' | 'title' | 'priority' | 'assignee' | 'status'>> = [
  { code: 'DOC-2026-01', title: '资料索引与归档说明', priority: '高', assignee: 'David', status: '进行中' },
  { code: 'DOC-2026-02', title: '目录与版本记录', priority: '中', assignee: 'Alex', status: '已完成' },
  { code: 'DOC-2026-03', title: '历史归档记录', priority: '低', assignee: 'Elena', status: '未开始' },
]

/** 纸面占位线（视觉层级，非数据） */
const Skeleton: React.FC<{ widths: string[]; className?: string }> = ({ widths, className = '' }) => (
  <div className={`space-y-1.5 opacity-50 ${className}`}>
    {widths.map((w, i) => (
      <div key={i} className="h-1 bg-slate-400 rounded" style={{ width: w }} />
    ))}
  </div>
)

/** 纸 3（后）：emerald code 标签 + 灰优先级 pill */
const Paper3: React.FC<{ doc: DocumentItem }> = ({ doc }) => (
  <>
    <div className="flex items-center justify-between text-caption font-mono text-slate-600 border-b border-slate-300 pb-1">
      <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">{doc.code}</span>
      <span className="px-1.5 py-0.5 bg-slate-300 rounded text-slate-800 font-bold">{doc.priority}</span>
    </div>
    <div className="text-caption font-extrabold truncate text-slate-800 my-1">{doc.title}</div>
    <Skeleton widths={['100%', '66%', '80%']} className="opacity-60 mt-3" />
  </>
)

/** 纸 2（中）：amber code 标签 + amber 优先级 pill + amber 状态行 */
const Paper2: React.FC<{ doc: DocumentItem }> = ({ doc }) => (
  <>
    <div className="flex items-center justify-between text-caption font-mono text-slate-600 border-b border-slate-200 pb-1">
      <span className="font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded">{doc.code}</span>
      <span className="text-caption bg-amber-200 text-amber-950 font-extrabold px-1.5 py-0.5 rounded border border-amber-300">{doc.priority}</span>
    </div>
    <div className="text-caption font-extrabold truncate text-slate-900 my-1">{doc.title}</div>
    <div className="flex items-center justify-between text-micro text-slate-600 bg-slate-50 p-1 rounded border border-slate-200 mt-2">
      <span>负责人: {doc.assignee}</span>
      <span className="text-amber-700 font-bold">{doc.status}</span>
    </div>
    <Skeleton widths={['100%', '75%']} className="opacity-60 mt-3" />
  </>
)

/** 纸 1（前）：FileText 图标 + code + 红/绿优先级 pill + emerald 状态行 */
const Paper1: React.FC<{ doc: DocumentItem }> = ({ doc }) => (
  <>
    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-2">
      <div className="flex items-center gap-1.5">
        <FileText className="w-3.5 h-3.5 text-emerald-600" />
        <span className="text-caption font-bold font-mono tracking-wider text-slate-800">{doc.code}</span>
      </div>
      <span
        className={`text-caption px-1.5 py-0.5 rounded-full font-extrabold border ${
          doc.priority === '高'
            ? 'bg-red-100 text-red-700 border-red-200'
            : 'bg-emerald-100 text-emerald-700 border-emerald-200'
        }`}
      >
        {doc.priority}优先级
      </span>
    </div>
    <div className="text-xs font-black text-slate-900 truncate leading-snug">{doc.title}</div>
    <div className="mt-2 flex items-center justify-between text-caption bg-slate-50 p-1.5 rounded-lg border border-slate-200">
      <span className="text-slate-700 font-bold truncate">负责人: {doc.assignee}</span>
      <span className="text-emerald-600 font-extrabold">{doc.status}</span>
    </div>
    <Skeleton widths={['100%', '83%', '80%']} className="opacity-60 mt-4" />
  </>
)

const PAPER_BODIES = [Paper1, Paper2, Paper3]

export const GlassFolderPapers: React.FC<GlassFolderPapersProps> = ({ docs, isActive }) => {
  return (
    <div className="gc-papers">
      {FAN_OUT.map((_, i) => {
        // 兜底字段与调用方文档合并（docs 不足三张时用 FALLBACK 补齐）
        const doc = { ...FALLBACK_DOCS[i], ...(docs[i] ?? {}) } as DocumentItem
        const Body = PAPER_BODIES[i]
        return (
          <div
            key={i}
            className={`gc-paper gc-paper--${i + 1}`}
            style={{ transform: isActive ? FAN_OUT[i] : FAN_IN[i] }}
          >
            <div>
              <Body doc={doc} />
            </div>
            <div className="pb-2">
              <Skeleton widths={['100%', '66%']} className="opacity-40" />
            </div>
          </div>
        )
      })}
    </div>
  )
}
