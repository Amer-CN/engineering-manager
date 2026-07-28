import { useMemo, useState, useEffect } from 'react'
import type { CostLedgerCategory } from '@/types'
import { getLevel1GroupsMerged, getLevel1ForCode, getCategoryLabel, getCategoryColor } from './config'

interface CategoryPickerProps {
  direction: 'expense' | 'income'
  value: string
  onChange: (code: string) => void
  categories?: CostLedgerCategory[]
  onManage?: () => void
}

export function CategoryPicker({ direction, value, onChange, categories, onManage }: CategoryPickerProps) {
  const groups = useMemo(() => getLevel1GroupsMerged(categories, direction), [categories, direction])
  const currentLevel1 = useMemo(() => getLevel1ForCode(value, categories), [value, categories])

  const [selectedGroup, setSelectedGroup] = useState(() => currentLevel1 || groups[0]?.name || '')

  useEffect(() => {
    if (currentLevel1) {
      setSelectedGroup(currentLevel1)
    } else {
      setSelectedGroup(groups[0]?.name || '')
    }
  }, [currentLevel1, groups])

  const level2Options = useMemo(() => {
    const group = groups.find(g => g.name === selectedGroup)
    if (!group) return []
    return group.codes.map(code => ({
      code,
      label: getCategoryLabel(code, categories),
      color: getCategoryColor(code, categories),
    }))
  }, [selectedGroup, groups, categories])

  const handleGroupChange = (groupName: string) => {
    setSelectedGroup(groupName)
    const group = groups.find(g => g.name === groupName)
    if (group && group.codes.length > 0) {
      onChange(group.codes[0])
    }
  }

  const groupOptions = useMemo(() => groups.map(g => ({ name: g.name, color: g.color })), [groups])

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={selectedGroup}
          onChange={e => handleGroupChange(e.target.value)}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
        >
          {groupOptions.map(g => (
            <option key={g.name} value={g.name}>{g.name}</option>
          ))}
        </select>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-2.5 py-2 text-sm focus:border-[color:var(--accent)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent)]"
        >
          {level2Options.map(c => (
            <option key={c.code} value={c.code}>{c.label}</option>
          ))}
        </select>
      </div>
      {onManage && (
        <button type="button" onClick={onManage} className="text-xs text-[color:var(--accent)] hover:opacity-80">
          管理分类...
        </button>
      )}
    </div>
  )
}
