/**
 * RichToolResult — 结构化工具结果富卡片渲染
 *
 * 智能识别 ToolCallResult.result 的形状：
 *  - 对象数组 → 紧凑表格（默认前 8 行，可展开）
 *  - 含嵌套数组的对象 → 标量键值网格 + 嵌套子表
 *  - 单对象 → 键值网格
 *  - 字符串/数字/布尔 → 文本
 *  - 空/错误 → 占位/红字
 * 纯前端渲染，不依赖后端改动。
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import type { ToolCallResult } from '@/types/agent'
import {
  toolLabel, toolNav, fieldLabel, formatValue, isObjectArray, isScalar,
} from './richToolResult.utils'
import { navigateTo } from './types'
import KnowledgeSourceCard from './KnowledgeSourceCard'
import DataTable from './DataTable'

/** 标量对象 → 键值网格 */
const KeyValueGrid: React.FC<{ obj: Record<string, unknown> }> = ({ obj }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
    {Object.entries(obj).map(([k, v]) => (
      <div key={k} className="flex gap-1.5 min-w-0">
        <span className="flex-shrink-0" style={{ color: 'var(--muted)' }}>{fieldLabel(k)}:</span>
        <span className="break-all" style={{ color: 'var(--fg-2)' }}>{formatValue(k, v)}</span>
      </div>
    ))}
  </div>
)

/** 递归渲染任意 result 值 */
const RenderValue: React.FC<{ value: unknown }> = ({ value }) => {
  if (value === null || value === undefined) {
    return <span className="text-xs" style={{ color: 'var(--muted)' }}>暂无数据</span>
  }
  if (isScalar(value)) {
    return <span className="text-xs break-words" style={{ color: 'var(--fg-2)' }}>{formatValue('', value)}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-xs" style={{ color: 'var(--muted)' }}>暂无数据</span>
    }
    if (isObjectArray(value)) {
      return <DataTable rows={value} />
    }
    return (
      <span className="text-xs" style={{ color: 'var(--fg-2)' }}>
        {value.map((v: unknown) => formatValue('', v)).join('、')}
      </span>
    )
  }
  const obj = value as Record<string, unknown>
  const scalarEntries: Record<string, unknown> = {}
  const nestedEntries: [string, unknown][] = []
  Object.entries(obj).forEach(([k, v]) => {
    if (isScalar(v)) scalarEntries[k] = v
    else nestedEntries.push([k, v])
  })

  return (
    <div className="space-y-2">
      {Object.keys(scalarEntries).length > 0 && <KeyValueGrid obj={scalarEntries} />}
      {nestedEntries.map(([k, v]) => (
        <div key={k}>
          <div className="text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>{fieldLabel(k)}</div>
          <RenderValue value={v} />
        </div>
      ))}
    </div>
  )
}

/** 单个工具结果卡片 */
const ToolResultCard: React.FC<{ result: ToolCallResult }> = ({ result }) => {
  const [open, setOpen] = useState(true)
  const count = Array.isArray(result.result) ? result.result.length : null
  // S9 Stitch: 数据来源对应模块→底部“打开 XX →”链接
  const nav = result.success ? toolNav(result.toolName) : null

  return (
    <div
      className="rounded-xl border text-xs overflow-hidden"
      style={result.success
        ? { background: 'var(--card)', borderColor: 'var(--border)' }
        : { background: 'var(--danger-soft)', borderColor: 'var(--danger)' }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[color:var(--panel-2)] transition-colors"
      >
        <span className="flex-shrink-0" style={{ color: result.success ? 'var(--muted)' : 'var(--danger)' }}>
          <Icon name={result.success ? 'Database' : 'XCircle'} size={14} />
        </span>
        <span className="font-semibold" style={{ color: 'var(--fg)' }}>
          {result.success ? `数据来源：${toolLabel(result.toolName)}` : toolLabel(result.toolName)}
        </span>
        {count !== null && <span style={{ color: 'var(--muted)' }}>· {count} 条</span>}
        <span className="ml-auto" style={{ color: 'var(--muted)' }}>
          <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={14} />
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2.5 pt-0.5">
          {result.error ? (
            <span style={{ color: 'var(--danger)' }}>{result.error}</span>
          ) : result.toolName === 'searchKnowledgeBase' ? (
            <KnowledgeSourceCard result={result.result} />
          ) : (
            <RenderValue value={result.result} />
          )}
          {/* S9 Stitch: 打开对应模块链接 */}
          {nav && (
            <button
              type="button"
              onClick={() => navigateTo(nav.page)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
              style={{ color: 'var(--accent)' }}
            >
              打开{nav.label}
              <Icon name="ArrowRight" size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

interface RichToolResultProps {
  results: ToolCallResult[]
}

const RichToolResult: React.FC<RichToolResultProps> = ({ results }) => {
  if (!results || results.length === 0) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2 space-y-2 w-full"
    >
      {results.map((r, i) => (
        <ToolResultCard key={r.toolCallId || i} result={r} />
      ))}
    </motion.div>
  )
}

export default RichToolResult
