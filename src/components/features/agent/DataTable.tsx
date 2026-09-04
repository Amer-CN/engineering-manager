/**
 * DataTable — RichToolResult 对象数组表格（Beautiful UI A1 + A2 升级版）
 *
 * 来源：TurboKach/ai-native-react-components（MIT），视觉基准 .work/reference/beautifului/
 * 的 records-table.tsx / filter-table.tsx 裁剪移植（token 全部映射到现有 CSS 变量，
 * 未抄 TAG_COLORS 十六进制色板）：
 *  - 表头点击排序（升/降循环；字符串 localeCompare('zh')、数字列数值比较，用原始值）
 *  - 首列粘性（sticky left-0 + var(--card) 底色，横向滚动时首列不动）
 *  - 状态列值渲染彩色小标签（dot + 文字，statusTone → 主题变量色）
 *  - 表尾统计行（共 N 条 · 金额列合计 ¥X）
 *  - 状态筛选芯片（计数固定不随筛选变；行以 grid-template-rows 1fr↔0fr + opacity 收起）
 */

import React, { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  fieldLabel, formatValue, statusTone, MONEY_KEYS,
} from './richToolResult.utils'

const MAX_ROWS = 8

/** statusTone → 颜色变量（info 走现有 --color-info-500 三元组变量，不新增变量） */
const TONE_COLORS: Record<string, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'rgb(var(--color-info-500))',
}

/** 行收起缓动（filter-table 同款） */
const EASE = 'cubic-bezier(0.23, 1, 0.32, 1)'

interface SortState { key: string; dir: 1 | -1 }

/** 筛选芯片：彩色 dot + 计数徽标 + aria-pressed（filter-table 同款） */
const Chip: React.FC<{
  label: string; count: number; active: boolean; onClick: () => void; dot?: string
}> = ({ label, count, active, onClick, dot }) => (
  <button
    type="button"
    aria-pressed={active}
    onClick={onClick}
    className="flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors duration-200"
    style={{
      background: active ? 'var(--panel-2)' : 'transparent',
      color: active ? 'var(--fg)' : 'var(--muted)',
    }}
  >
    {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: dot }} />}
    {label}
    <span
      className="rounded px-1 tabular-nums"
      style={{
        background: active ? 'var(--card)' : 'var(--panel-2)',
        color: active ? 'var(--muted)' : 'var(--muted-2)',
      }}
    >
      {count}
    </span>
  </button>
)

/** 对象数组 → 升级版表格（排序 / 粘性首列 / 状态标签 / 表尾合计 / 筛选芯片） */
export const DataTable: React.FC<{ rows: Record<string, unknown>[] }> = ({ rows }) => {
  const [expanded, setExpanded] = useState(false)
  const [sort, setSort] = useState<SortState | null>(null)
  const [filter, setFilter] = useState<string | null>(null) // null = 全部

  const columns = useMemo(() => Array.from(
    rows.reduce((set, r) => {
      Object.keys(r).forEach((k) => set.add(k))
      return set
    }, new Set<string>()),
  ), [rows])

  /** 状态列（列名含 status）及其去重值域（保首次出现顺序） */
  const statusCol = useMemo(
    () => columns.find((c) => /status/i.test(c)) ?? null,
    [columns],
  )
  const statusValues = useMemo(() => {
    if (!statusCol) return []
    const seen: string[] = []
    rows.forEach((r) => {
      const v = r[statusCol]
      if (v === null || v === undefined || v === '') return
      const s = String(v)
      if (!seen.includes(s)) seen.push(s)
    })
    return seen
  }, [rows, statusCol])
  const showChips = statusCol !== null && statusValues.length >= 2

  /** 全量排序结果（行渲染用它，筛选行只收起不删除） */
  const sortedAll = useMemo(() => {
    if (!sort) return rows
    const dir = sort.dir
    return [...rows].sort((a, b) => {
      const va = a[sort.key]
      const vb = b[sort.key]
      // 金额/数字列：数值比较（formatValue 之前的原始值）
      if (
        typeof va === 'number' && typeof vb === 'number' &&
        Number.isFinite(va) && Number.isFinite(vb)
      ) return (va - vb) * dir
      // 其余按中文字符串比较
      const sa = va === null || va === undefined ? '' : String(va)
      const sb = vb === null || vb === undefined ? '' : String(vb)
      return sa.localeCompare(sb, 'zh') * dir
    })
  }, [rows, sort])

  /** 筛选后集合（表尾统计 / 合计用；行收起时 DOM 仍在） */
  const sortedFiltered = useMemo(() => {
    if (filter === null || !showChips) return sortedAll
    return sortedAll.filter((r) => String(r[statusCol!]) === filter)
  }, [sortedAll, filter, showChips, statusCol])

  const shown = expanded ? sortedAll : sortedAll.slice(0, MAX_ROWS)

  /** 可求和金额列（MONEY_KEYS 判断；全部行均为有限数字才算） */
  const sums = useMemo(() => {
    const out: [string, number][] = []
    columns.forEach((c) => {
      if (!MONEY_KEYS.test(c) || sortedFiltered.length === 0) return
      let sum = 0
      const ok = sortedFiltered.every((r) => {
        const v = r[c]
        if (typeof v !== 'number' || !Number.isFinite(v)) return false
        sum += v
        return true
      })
      if (ok) out.push([c, sum])
    })
    return out
  }, [columns, sortedFiltered])

  const toggleSort = (key: string) => setSort((cur) =>
    cur && cur.key === key
      ? { key, dir: (cur.dir * -1) as 1 | -1 }
      : { key, dir: 1 })

  const money = (n: number) => '¥' + n.toLocaleString('zh-CN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })

  const colTemplate = `repeat(${columns.length}, minmax(max-content, 1fr))`
  const stickyFirst = (i: number) =>
    i === 0 ? 'sticky left-0 z-10' : ''

  return (
    <div>
      {/* A2 状态筛选芯片（无状态列 / 值域 <2 不渲染；计数固定） */}
      {showChips && (
        <div className="mb-1.5 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <Chip
            label="全部"
            count={rows.length}
            active={filter === null}
            onClick={() => setFilter(null)}
          />
          {statusValues.map((v) => (
            <Chip
              key={v}
              label={formatValue(statusCol!, v)}
              count={rows.filter((r) => String(r[statusCol!]) === v).length}
              dot={TONE_COLORS[statusTone(v) ?? ''] ?? 'var(--muted)'}
              active={filter === v}
              onClick={() => setFilter((cur) => (cur === v ? null : v))}
            />
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        {/* 表头（可点击排序，箭头随升降旋转） */}
        <div
          className="grid border-b text-left text-xs"
          style={{ gridTemplateColumns: colTemplate, color: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          {columns.map((c, i) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleSort(c)}
              className={`flex items-center gap-0.5 py-1.5 px-2 font-medium whitespace-nowrap transition-opacity hover:opacity-80 ${stickyFirst(i)}`}
              style={i === 0 ? { background: 'var(--card)' } : undefined}
            >
              {fieldLabel(c)}
              {sort?.key === c && (
                <span
                  className="inline-flex"
                  style={{ transform: sort.dir === -1 ? 'rotate(180deg)' : undefined }}
                >
                  <Icon name="ChevronUp" size={12} />
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 数据行：隐藏行 DOM 保留，grid-template-rows 0fr + opacity 收起（filter-table 写法） */}
        {shown.map((row, i) => {
          const visible =
            filter === null || !showChips || String(row[statusCol!]) === filter
          return (
            <div
              key={i}
              className="grid"
              style={{
                gridTemplateRows: visible ? '1fr' : '0fr',
                opacity: visible ? 1 : 0,
                transition: `grid-template-rows 300ms ${EASE}, opacity 300ms ${EASE}`,
                borderBottom: i === shown.length - 1 ? 'none' : '1px solid var(--border)',
              }}
            >
              <div style={{ overflow: 'hidden' }}>
                <div className="grid items-center" style={{ gridTemplateColumns: colTemplate }}>
                  {columns.map((c, ci) => {
                    const v = row[c]
                    const tone = c === statusCol ? statusTone(v) : null
                    return (
                      <div
                        key={c}
                        className={`py-1.5 px-2 whitespace-nowrap text-xs ${stickyFirst(ci)}`}
                        style={ci === 0
                          ? { color: 'var(--fg-2)', background: 'var(--card)' }
                          : { color: 'var(--fg-2)' }}
                      >
                        {tone ? (
                          <span
                            className="inline-flex items-center gap-1"
                            style={{ color: TONE_COLORS[tone] }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ background: TONE_COLORS[tone] }}
                            />
                            {formatValue(c, v)}
                          </span>
                        ) : (
                          formatValue(c, v)
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}

        {/* 表尾统计行：共 N 条 · 金额列合计（金额列可求和时） */}
        <div
          className="flex items-center gap-2 py-1.5 px-2 text-xs"
          style={{ color: 'var(--muted)', borderTop: '1px solid var(--border)' }}
        >
          <span>共 {sortedFiltered.length} 条</span>
          {sums.map(([c, s]) => (
            <span key={c}>· {fieldLabel(c)}合计 {money(s)}</span>
          ))}
        </div>
      </div>

      {rows.length > MAX_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-medium"
          style={{ color: 'var(--accent)' }}
        >
          {expanded ? '收起' : `展开全部（共 ${rows.length} 条）`}
        </button>
      )}
    </div>
  )
}

export default DataTable
