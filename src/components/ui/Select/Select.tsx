import React, { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../Icon'
import { HoverScrollbar } from '../HoverScrollbar'

export interface SelectOption {
  label: string
  value: string | number
  disabled?: boolean
  [key: string]: unknown
}

export interface SelectProps {
  options: SelectOption[]
  value?: string | number | (string | number)[]
  defaultValue?: string | number | (string | number)[]
  placeholder?: string
  multiple?: boolean
  searchable?: boolean
  disabled?: boolean
  clearable?: boolean
  label?: string
  error?: string
  onChange?: (value: string | number | (string | number)[]) => void
  className?: string
}

export function Select({
  options,
  value,
  defaultValue,
  placeholder = '请选择',
  multiple = false,
  searchable = false,
  disabled = false,
  clearable = false,
  label,
  error,
  onChange,
  className = '',
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const currentValue = value ?? defaultValue

  const getSelectedLabels = () => {
  if (multiple && Array.isArray(currentValue)) {
  const selected = options.filter(opt => currentValue.includes(opt.value))
  return selected.map(opt => opt.label)
  }
  const selected = options.find(opt => opt.value === currentValue)
  return selected ? [selected.label] : []
  }

  const selectedLabels = getSelectedLabels()

  const filteredOptions = searchable
  ? options.filter(opt => opt.label.toLowerCase().includes(searchValue.toLowerCase()))
  : options

  useEffect(() => {
  const handleClickOutside = (e: MouseEvent) => {
  if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
  setIsOpen(false)
  setSearchValue('')
  }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (option: SelectOption) => {
  if (option.disabled) return
  if (multiple) {
  const currentValues = Array.isArray(currentValue) ? currentValue : []
  const newValues = currentValues.includes(option.value)
  ? currentValues.filter(v => v !== option.value)
  : [...currentValues, option.value]
  onChange?.(newValues)
  } else {
  onChange?.(option.value)
  setIsOpen(false)
  setSearchValue('')
  }
  }

  const handleClear = (e: React.MouseEvent) => {
  e.stopPropagation()
  if (multiple) {
  onChange?.([])
  } else {
  onChange?.(undefined as unknown as string | number | (string | number)[])
  }
  }

  const isSelected = (optionValue: string | number) => {
  if (multiple && Array.isArray(currentValue)) {
  return currentValue.includes(optionValue)
  }
  return currentValue === optionValue
  }

  const hasValue = multiple ? (Array.isArray(currentValue) && currentValue.length > 0) : currentValue !== undefined && currentValue !== ''

  return (
  <div className={`w-full ${className}`} ref={containerRef}>
  {label && (
  <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1.5">
  {label}
  </label>
  )}

  <div className="relative">
  <button
  type="button"
  onClick={() => !disabled && setIsOpen(!isOpen)}
  disabled={disabled}
  className={`
  w-full px-4 py-2.5 bg-[color:var(--card)] text-left
  border rounded-lg
  transition-[box-shadow,border-color,background-color,color] duration-200
  focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)]
  hover:border-[color:var(--border)]
  disabled:bg-[color:var(--panel-2)] disabled:text-[color:var(--muted)] disabled:cursor-not-allowed
  ${error
  ? 'border-danger-500 focus:ring-danger-500/20'
  : 'border-[color:var(--border)]'
  }
  ${isOpen ? 'ring-2 ring-[color:var(--accent-soft)] border-[color:var(--accent)]' : ''}
  `}
  >
  <div className="flex items-center justify-between gap-2">
  <span className={`truncate ${selectedLabels.length ? 'text-[color:var(--fg)]' : 'text-[color:var(--muted)]'}`}>
  {selectedLabels.length > 0
  ? (multiple ? selectedLabels.join(', ') : selectedLabels[0])
  : placeholder
  }
  </span>
  <div className="flex items-center gap-1 flex-shrink-0">
  {clearable && hasValue && (
  <span onClick={handleClear} className="p-0.5 hover:bg-[color:var(--panel-2)] rounded transition-colors">
  <Icon name="X" size={14} className="text-[color:var(--muted)]" />
  </span>
  )}
  <Icon name="ChevronDown" size={16} className={`text-[color:var(--muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
  </div>
  </div>
  </button>

  <AnimatePresence>
  {isOpen && (
  <motion.div
  className="absolute z-50 w-full mt-1 bg-[color:var(--card)] rounded-lg shadow-lg border border-[color:var(--border)] overflow-hidden"
  initial={{ opacity: 0, y: -4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -4 }}
  transition={{ duration: 0.15 }}
  >
  {searchable && (
  <div className="p-2 border-b border-[color:var(--border)]">
  <div className="relative">
  <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--muted)]" />
  <input
  type="text"
  value={searchValue}
  onChange={(e) => setSearchValue(e.target.value)}
  placeholder="搜索..."
  className="w-full pl-8 pr-3 py-2 border border-[color:var(--border)] rounded-lg text-sm bg-[color:var(--card)] text-[color:var(--fg)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
  autoFocus
  />
  </div>
  </div>
  )}

  <HoverScrollbar className="max-h-60">
  {filteredOptions.length === 0 ? (
  <div className="px-4 py-8 text-sm text-[color:var(--muted)] text-center">
  暂无数据
  </div>
  ) : (
  filteredOptions.map((option) => (
  <button
  key={option.value}
  type="button"
  onClick={() => handleSelect(option)}
  disabled={option.disabled}
  className={`
  w-full px-4 py-2.5 text-left text-sm
  transition-colors
  hover:bg-[color:var(--panel-2)]
  disabled:opacity-50 disabled:cursor-not-allowed
  ${isSelected(option.value) ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]' : 'text-[color:var(--fg-2)]'}
  `}
  >
  <div className="flex items-center gap-2">
  {multiple && (
  <input
  type="checkbox"
  checked={isSelected(option.value)}
  onChange={() => {}}
  className="w-4 h-4 text-[color:var(--accent)] rounded border-[color:var(--border)] focus:ring-[color:var(--accent-soft)]"
  />
  )}
  {option.label}
  </div>
  </button>
  ))
  )}
  </HoverScrollbar>
  </motion.div>
  )}
  </AnimatePresence>
  </div>

  {error && (
  <p className="mt-1.5 text-sm text-danger-500" role="alert">{error}</p>
  )}
  </div>
  )
}
