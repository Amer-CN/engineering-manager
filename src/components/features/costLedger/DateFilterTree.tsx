import { useState, useRef, useEffect } from 'react'

// ══════════════════════════════════════════════
// 日期树节点（年月折叠 → Excel 风格日期筛选）
// ══════════════════════════════════════════════

interface DateNode {
  type: 'year' | 'month' | 'day'
  label: string       // "2026年" / "1月" / "2026-01-15"
  key: string         // expand state key
  dates: string[]     // all leaf date strings under this node
  children: DateNode[]
}

function buildDateTree(dates: string[]): DateNode[] {
  const yearMap = new Map<string, Map<string, string[]>>()
  for (const d of dates) {
    const parts = d.split('-')
    if (parts.length < 3) continue
    const [y, m] = parts
    if (!yearMap.has(y)) yearMap.set(y, new Map())
    const monthMap = yearMap.get(y)!
    if (!monthMap.has(m)) monthMap.set(m, [])
    monthMap.get(m)!.push(d)
  }

  const tree: DateNode[] = []
  const sortedYears = [...yearMap.entries()].sort(([a], [b]) => Number(b) - Number(a))
  for (const [year, monthMap] of sortedYears) {
    const months: DateNode[] = []
    const sortedMonths = [...monthMap.entries()].sort(([a], [b]) => Number(b) - Number(a))
    for (const [month, dayDates] of sortedMonths) {
      months.push({
        type: 'month',
        label: `${parseInt(month)}月`,
        key: `${year}-${month}`,
        dates: [...dayDates].sort(),
        children: [...dayDates].sort().map(d => ({
          type: 'day' as const,
          label: d,
          key: d,
          dates: [d],
          children: [],
        })),
      })
    }
    tree.push({
      type: 'year',
      label: `${year}年`,
      key: year,
      dates: [...monthMap.values()].flat(),
      children: months,
    })
  }
  return tree
}

// ══════════════════════════════════════════════
// 三态复选框
// ══════════════════════════════════════════════

function GroupCheckbox({ state, onChange }: { state: 'checked' | 'indeterminate' | 'none'; onChange: () => void }) {
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'indeterminate'
    }
  }, [state])

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={state === 'checked'}
      onChange={onChange}
      className="h-3 w-3 rounded border-slate-300 shrink-0"
    />
  )
}

// ══════════════════════════════════════════════

interface DateFilterTreeProps {
  values: string[]
  checked: Set<string>
  toggle: (v: string) => void
  setAll: (vals: string[]) => void
  clear: () => void
}

export function DateFilterTree({ values, checked, toggle, setAll, clear }: DateFilterTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const dateTree = buildDateTree(values)

  const toggleExpand = (key: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Toggle all dates under a year/month node
  const toggleDateGroup = (node: DateNode) => {
    const nodeDates = new Set(node.dates)
    const allChecked = node.dates.every(d => checked.has(d))
    if (allChecked) {
      setAll([...checked].filter(d => !nodeDates.has(d)))
    } else {
      setAll([...new Set([...checked, ...node.dates])])
    }
  }

  const getGroupCheckState = (node: DateNode): 'checked' | 'indeterminate' | 'none' => {
    const checkedCount = node.dates.filter(d => checked.has(d)).length
    if (checkedCount === 0) return 'none'
    if (checkedCount === node.dates.length) return 'checked'
    return 'indeterminate'
  }

  const renderNode = (node: DateNode, depth: number): React.ReactNode => {
    if (node.type === 'day') {
      return (
        <label key={node.key} className="flex items-center gap-1.5 cursor-pointer rounded px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
          style={{ paddingLeft: 28 + depth * 12 }}>
          <input type="checkbox" checked={checked.has(node.dates[0])}
            onChange={() => toggle(node.dates[0])}
            className="h-3 w-3 rounded border-slate-300 shrink-0" />
          <span className="truncate">{node.label}</span>
        </label>
      )
    }

    const isExpanded = expandedNodes.has(node.key)
    const checkState = getGroupCheckState(node)
    const hasChildren = node.children.length > 0

    return (
      <div key={node.key}>
        <div className="flex items-center gap-1 cursor-pointer rounded px-1 py-0.5 text-xs hover:bg-slate-50"
          style={{ paddingLeft: 4 + depth * 12 }}>
          {hasChildren ? (
            <button type="button" onClick={() => toggleExpand(node.key)}
              className="shrink-0 w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <svg width="8" height="8" viewBox="0 0 8 8"
                style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                <path d="M2.5 1L5.5 4L2.5 7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <GroupCheckbox state={checkState} onChange={() => toggleDateGroup(node)} />
          <span className="truncate text-slate-700 font-medium">{node.label}</span>
          <span className="ml-auto text-[10px] text-slate-400 shrink-0">{node.dates.length}</span>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-h-52 overflow-y-auto p-1">
      {values.length === 0 ? (
        <p className="px-2 py-1 text-xs text-slate-400">无可用值</p>
      ) : (
        <>
          <div className="flex gap-1 border-b border-slate-100 px-1 pb-1 mb-1">
            <button type="button" onClick={() => setAll(values)} className="text-[10px] text-blue-600 hover:text-blue-800">全选</button>
            <button type="button" onClick={clear} className="text-[10px] text-slate-400 hover:text-slate-600">清除</button>
          </div>
          {dateTree.length === 0 ? (
            <p className="px-2 py-1 text-xs text-slate-400">无可用值</p>
          ) : (
            dateTree.map(node => renderNode(node, 0))
          )}
        </>
      )}
    </div>
  )
}
