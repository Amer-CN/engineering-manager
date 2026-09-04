/**
 * DataTable — RichToolResult 对象数组表格（Beautiful UI A1 + A2，原生 <table> 版）
 *
 * 来源：TurboKach/ai-native-react-components（MIT），视觉基准 .work/reference/beautifului/
 * 的 records-table.tsx / filter-table.tsx 裁剪移植（token 全部映射到现有 CSS 变量）：
 *  - 表头点击排序（升/降循环；字符串 localeCompare('zh')、数字列数值比较，用原始值）
 *  - 首列粘性（sticky left-0 + var(--card) 底色，横向滚动时首列不动）
 *  - 状态列值渲染彩色小标签（dot + 文字，statusTone → 主题变量色）
 *  - 表尾统计行（共 N 条 · 金额列合计 ¥X）
 *  - 状态筛选芯片（计数固定不随筛选变）+ 真实过滤（不匹配行直接不渲染）
 *
 * 为什么用原生 <table>：表头/数据若各自独立 grid 容器，minmax(max-content,1fr) 会按
 * 各自内容分列宽 → 列线锯齿错位、横向滚动表头不跟随；<table> 列宽由浏览器跨
 * thead/tbody 自动同步。粘性首列在 border-separate(spacing-0) 下由单元格自持边框，
 * 列分隔线用 box-shadow 内嵌线（粘性位移时仍跟随单元格）。
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

/** 首列粘性单元格（th/td 同款）：sticky + 底色盖住滚动内容 + 右缘 box-shadow 内嵌线
 *  （粘性位移下自带 border 会脱离单元格，内嵌线不随横向滚动消失） */
const STICKY_FIRST: React.CSSProperties = {
  position: 'sticky',
  left: 0,
  zIndex: 1,
  background: 'var(--card)',
  boxShadow: 'inset -1px 0 0 var(--border)',
}

/** 行一次性进场（替代旧 grid 0fr 收起动画：table 行无法做收起，真实过滤直接增删行） */
const ROW_ENTER: React.CSSProperties = { animation: 'fade-in 240ms ease both' }

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

  /** 全量排序结果 */
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

  /** 筛选后集合（表尾统计 / 合计 / 行渲染都用它：真实过滤，不匹配行不渲染） */
  const sortedFiltered = useMemo(() => {
    if (filter === null || !showChips) return sortedAll
    return sortedAll.filter((r) => String(r[statusCol!]) === filter)
  }, [sortedAll, filter, showChips, statusCol])

  const shown = expanded ? sortedFiltered : sortedFiltered.slice(0, MAX_ROWS)

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

  return (
    <div>
      {/* A2 状态筛选芯片（无状态列 / 值域 <2 不渲染；计数固定用全量 rows） */}
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
        {/* 原生 table：列宽由浏览器跨 thead/tbody 自动同步；border-separate(spacing-0)
            让每个单元格自持边框（粘性首列位移时边线不掉） */}
        <table className="w-full text-xs" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className="py-1.5 px-2 text-left font-medium whitespace-nowrap"
                  style={{
                    color: 'var(--muted)',
                    borderBottom: '1px solid var(--border)',
                    ...(i === 0 ? STICKY_FIRST : null),
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(c)}
                    className="flex items-center gap-0.5 transition-opacity hover:opacity-80"
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
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} style={ROW_ENTER}>
                {columns.map((c, ci) => {
                  const v = row[c]
                  const tone = c === statusCol ? statusTone(v) : null
                  return (
                    <td
                      key={c}
                      className="py-1.5 px-2 whitespace-nowrap"
                      style={{
                        color: 'var(--fg-2)',
                        borderBottom: '1px solid var(--border)',
                        ...(ci === 0 ? STICKY_FIRST : null),
                      }}
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
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* 表尾统计行：共 N 条 · 金额列合计（金额列可求和时）。
            最后一行数据自带 border-bottom，此处不再加 borderTop（只留其一）。 */}
        <div className="flex items-center gap-2 py-1.5 px-2 text-xs" style={{ color: 'var(--muted)' }}>
          <span>共 {sortedFiltered.length} 条</span>
          {sums.map(([c, s]) => (
            <span key={c}>· {fieldLabel(c)}合计 {money(s)}</span>
          ))}
        </div>
      </div>

      {/* 展开按钮文案用筛选后计数（与表尾一致）；筛选后 ≤MAX_ROWS 隐藏 */}
      {sortedFiltered.length > MAX_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1.5 text-xs font-medium"
          style={{ color: 'var(--accent)' }}
        >
          {expanded ? '收起' : `展开全部（共 ${sortedFiltered.length} 条）`}
        </button>
      )}
    </div>
  )
}

export default DataTable
