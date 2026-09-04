/**
 * AtSourceMenu — @ 数据来源菜单（AgentComposer 行数门禁拆分件）
 * 交互样式镜像 AgentComposer 既有斜杠菜单；条目为 agent 数据域（中文 + 一句话描述）。
 *
 * 裁剪决定：选中后仅把「@域名 」作为纯文本插入草稿（LLM 会理解），
 * 不接任何真实数据源协议。
 */

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/** @ 数据来源条目（key 即插入文本） */
export interface AtSource {
  key: string
  desc: string
}

export const AT_SOURCES: AtSource[] = [
  { key: '发票', desc: '查询发票列表与待付款' },
  { key: '项目', desc: '项目状态与详情' },
  { key: '结算', desc: '结算记录与办理情况' },
  { key: '成本台账', desc: '成本支出汇总与分析' },
  { key: '人员', desc: '员工与工人信息' },
  { key: '合同', desc: '合同列表与签订情况' },
  { key: '知识库', desc: '检索知识库文档内容' },
]

/** 按词头过滤（key 包含即命中，空词头返回全部） */
export function filterAtSources(query: string): AtSource[] {
  return AT_SOURCES.filter((s) => !query || s.key.includes(query))
}

/** 检测草稿末尾的 @ 词头（@ 须在行首或空白后）；未命中返回 null */
export function detectAtToken(value: string): { query: string; tokenStart: number } | null {
  const m = /(^|\s)@(\S*)$/.exec(value)
  if (!m) return null
  return { query: m[2], tokenStart: m.index + m[1].length }
}

/** 选中后草稿：@token 替换为「@key 」（纯文本，带尾随空格结束菜单） */
export function insertAtSource(value: string, tokenStart: number, key: string): string {
  return `${value.slice(0, tokenStart)}@${key} `
}

interface AtSourceMenuProps {
  open: boolean
  items: AtSource[]
  activeIndex: number
  onSelect: (source: AtSource) => void
  onHover: (index: number) => void
}

const AtSourceMenu: React.FC<AtSourceMenuProps> = ({ open, items, activeIndex, onSelect, onHover }) => (
  <AnimatePresence>
    {open && items.length > 0 && (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-[color:var(--border)] bg-[color:var(--panel)] shadow-lg overflow-hidden z-20"
        role="listbox"
        aria-label="数据来源"
      >
        <div className="px-3 py-2 border-b border-[color:var(--border)] text-xs font-medium text-[color:var(--muted)]">数据来源</div>
        <div className="max-h-48 overflow-y-auto py-1">
          {items.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => onHover(i)}
              onClick={() => onSelect(s)}
              className={`w-full flex items-center gap-3 px-3 py-2 transition-colors text-left ${i === activeIndex ? 'bg-[color:var(--panel-2)]' : 'hover:bg-[color:var(--panel-2)]'}`}
            >
              <span className="px-1.5 py-0.5 rounded text-xs font-mono font-medium flex-shrink-0" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                @{s.key}
              </span>
              <span className="text-sm text-[color:var(--fg-2)] flex-shrink-0">{s.key}</span>
              <span className="text-xs text-[color:var(--muted)] truncate flex-1">{s.desc}</span>
            </button>
          ))}
        </div>
      </motion.div>
    )}
  </AnimatePresence>
)

export default AtSourceMenu
