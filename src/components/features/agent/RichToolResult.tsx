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
  toolLabel, fieldLabel, formatValue, isObjectArray, isScalar,
} from './richToolResult.utils'
import KnowledgeSourceCard from './KnowledgeSourceCard'

const MAX_ROWS = 8

/** 对象数组 → 表格 */
const DataTable: React.FC<{ rows: Record<string, unknown>[] }> = ({ rows }) => {
  const [expanded, setExpanded] = useState(false)
  const columns = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  )
  const shown = expanded ? rows : rows.slice(0, MAX_ROWS)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-200">
            {columns.map((c) => (
              <th key={c} className="py-1.5 px-2 font-medium whitespace-nowrap">
                {fieldLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {columns.map((c) => (
                <td key={c} className="py-1.5 px-2 text-slate-700 whitespace-nowrap">
                  {formatValue(c, row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > MAX_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs text-violet-600 hover:text-violet-700 font-medium"
        >
          {expanded ? '收起' : `展开全部（共 ${rows.length} 条）`}
        </button>
      )}
    </div>
  )
}

/** 标量对象 → 键值网格 */
const KeyValueGrid: React.FC<{ obj: Record<string, unknown> }> = ({ obj }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
    {Object.entries(obj).map(([k, v]) => (
      <div key={k} className="flex gap-1.5 min-w-0">
        <span className="text-slate-400 flex-shrink-0">{fieldLabel(k)}:</span>
        <span className="text-slate-700 break-all">{formatValue(k, v)}</span>
      </div>
    ))}
  </div>
)

/** 递归渲染任意 result 值 */
const RenderValue: React.FC<{ value: unknown }> = ({ value }) => {
  if (value === null || value === undefined) {
    return <span className="text-slate-400 text-xs">暂无数据</span>
  }
  if (isScalar(value)) {
    return <span className="text-slate-700 text-xs break-words">{formatValue('', value)}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-slate-400 text-xs">暂无数据</span>
    }
    if (isObjectArray(value)) {
      return <DataTable rows={value} />
    }
    return (
      <span className="text-slate-700 text-xs">
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
          <div className="text-xs font-medium text-slate-500 mb-1">{fieldLabel(k)}</div>
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

  return (
    <div
      className={`rounded-xl border text-xs overflow-hidden ${
        result.success ? 'bg-white border-slate-200' : 'bg-red-50 border-red-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 transition-colors"
      >
        <Icon
          name={result.success ? 'CheckCircle' : 'XCircle'}
          size={14}
          className={`flex-shrink-0 ${result.success ? 'text-emerald-500' : 'text-red-500'}`}
        />
        <span className="font-semibold text-slate-700">{toolLabel(result.toolName)}</span>
        {count !== null && <span className="text-slate-400">· {count} 条</span>}
        <Icon
          name={open ? 'ChevronDown' : 'ChevronRight'}
          size={14}
          className="ml-auto text-slate-400"
        />
      </button>
      {open && (
        <div className="px-3 pb-2.5 pt-0.5">
          {result.error ? (
            <span className="text-red-600">{result.error}</span>
          ) : result.toolName === 'searchKnowledgeBase' ? (
            <KnowledgeSourceCard result={result.result} />
          ) : (
            <RenderValue value={result.result} />
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
