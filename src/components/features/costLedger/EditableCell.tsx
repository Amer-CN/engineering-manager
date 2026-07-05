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

  // money：值以「元」存储，编辑框直接显示/输入元值，不做 ÷100 / ×100 转换
  const shown = meta.money ? (value == null ? '' : String(value)) : (value ?? '')

  return (
    <input
      type={meta.editType === 'number' || meta.money ? 'number' : meta.editType === 'date' ? 'date' : 'text'}
      step={meta.money ? '0.01' : undefined}
      inputMode={meta.money ? 'decimal' : undefined}
      className={`w-full bg-transparent px-1 outline-none focus:ring-1 focus:ring-primary-400 rounded ${meta.cellClass?.(initial, row.original) ?? ''}`}
      style={{ color: 'var(--fg)' }}
      value={shown as string}
      onChange={(e) => setValue(meta.money ? (parseFloat(e.target.value) || 0) : e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { (e.target as HTMLInputElement).blur() }
        if (e.key === 'Escape') { setValue(initial) }
      }}
    />
  )
}
