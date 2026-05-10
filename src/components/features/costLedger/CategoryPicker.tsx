import { useMemo } from 'react'
import type { CostLedgerCategory } from '@/types'
import { getCategoriesByDirection } from './config'

interface CategoryPickerProps {
  direction: 'expense' | 'income'
  value: string
  onChange: (code: string) => void
  categories?: CostLedgerCategory[]
  onManage?: () => void
}

export function CategoryPicker({ direction, value, onChange, categories, onManage }: CategoryPickerProps) {
  const options = useMemo(() => {
    if (categories && categories.length > 0) {
      return categories.filter(c => c.direction === direction && c.isEnabled !== false)
    }
    return getCategoriesByDirection(direction)
  }, [direction, categories])

  const builtins = options.filter(c => (c as any).isBuiltin !== false)
  const customs = options.filter(c => (c as any).isBuiltin === false)

  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {builtins.map(c => (
          <option key={c.code} value={c.code}>{c.label}</option>
        ))}
        {customs.length > 0 && (
          <>
            <option disabled>──────</option>
            {customs.map(c => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </>
        )}
      </select>
      {onManage && (
        <button
          type="button"
          onClick={onManage}
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          管理分类...
        </button>
      )}
    </div>
  )
}
