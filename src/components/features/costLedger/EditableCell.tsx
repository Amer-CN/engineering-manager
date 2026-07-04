import { useEffect, useState } from 'react'
import type { CellContext } from '@tanstack/react-table'
import { fmtMoney } from './gridColumns'

export function EditableCell<T>({ getValue, row, column, table }: CellContext<T, unknown>) {
  const meta = column.columnDef.meta
  const initial = getValue()
  const [value, setValue] = useState<unknown>(initial)
  useEffect(() => setValue(initial), [initial])

  // 只读单元格：直接显示 + 条件格式
  if (!meta?.editable) {
    const cls = meta?.cellClass?.(initial, row.original) ?? ''
    return <span className={cls}>{meta?.money ? fmtMoney(initial) : String(initial ?? '-')}</span>
  }

  const commit = () => { if (value !== initial) table.options.meta?.updateCell(row.id, column.id, value) }

  // money：编辑框里显示「元」，提交时由 updateCell 统一 ×100 转「分」
  const shown = meta.money ? (value == null ? '' : String((Number(value) || 0) / 100)) : (value ?? '')

  return (
    <input
      type={meta.editType === 'number' || meta.money ? 'number' : meta.editType === 'date' ? 'date' : 'text'}
      inputMode={meta.money ? 'decimal' : undefined}
      className={`w-full bg-transparent px-1 outline-none focus:bg-white focus:ring-1 focus:ring-primary-400 rounded ${meta.cellClass?.(initial, row.original) ?? ''}`}
      value={shown as string}
      onChange={(e) => setValue(meta.money ? Math.round(Number(e.target.value) * 100) : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() }
        if (e.key === 'Escape') { setValue(initial) }
      }}
    />
  )
}
