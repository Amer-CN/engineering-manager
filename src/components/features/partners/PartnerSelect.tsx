/**
 * PartnerSelect 组件
 * 
 * 优化版单位选择组件 - 支持搜索、筛选、分组
 * 适用场景：收入/支出合同、发票等单位选择
 */

import { useState, useMemo } from 'react'
import type { Partner, PartnerCategory } from '@/types'
import { Icon } from '../../ui/Icon'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import { Button } from '../../ui/Button'

const categoryLabels: Record<PartnerCategory | string, string> = {
  owner: '建设单位',
  general_contract: '总承包',
  professional: '专业分包',
  labor: '劳务分包',
  material: '材料供应',
  equipment: '设备租赁',
  design: '设计单位',
  supervisor: '监理单位',
  survey: '地勘单位',
  testing: '检测单位',
  other: '其他',
}

interface PartnerSelectProps {
  partners: Partner[]
  value: number | null
  onChange: (partnerId: number | null) => void
  placeholder?: string
  className?: string
}

export function PartnerSelect({ 
  partners, 
  value, 
  onChange, 
  placeholder = '选择单位',
  className = ''
}: PartnerSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // 选中的单位
  const selectedPartner = partners.find(p => p.id === value)

  // 筛选后的单位列表
  const filteredPartners = useMemo(() => {
  return partners.filter(partner => {
  // 搜索筛选
  if (searchTerm) {
  const term = searchTerm.toLowerCase()
  const matchesName = partner.name.toLowerCase().includes(term)
  const matchesContact = partner.contact?.toLowerCase().includes(term)
  if (!matchesName && !matchesContact) return false
  }

  // 分类筛选
  if (filterCategory !== 'all' && partner.category !== filterCategory) {
  return false
  }

  return true
  })
  }, [partners, searchTerm, filterCategory])

  // 按分类分组
  const groupedPartners = useMemo(() => {
  const groups: Record<string, Partner[]> = {}
  
  filteredPartners.forEach(partner => {
  const category = partner.category || 'other'
  if (!groups[category]) {
  groups[category] = []
  }
  groups[category].push(partner)
  })

  return groups
  }, [filteredPartners])

  return (
  <div className={`relative ${className}`}>
  {/* 触发按钮 */}
  <button
  type="button"
  onClick={() => setIsOpen(!isOpen)}
  className="w-full px-4 py-2 text-left bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg hover:border-[color:var(--accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)] transition-colors"
  >
  {selectedPartner ? (
  <div className="flex items-center justify-between">
  <div>
  <div className="font-medium text-[color:var(--fg)]">{selectedPartner.name}</div>
  <div className="text-xs text-[color:var(--muted)]">{categoryLabels[selectedPartner.category] || selectedPartner.category}</div>
  </div>
  <Icon name="ChevronDown" size={16} className="text-[color:var(--muted)]" />
  </div>
  ) : (
  <span className="text-[color:var(--muted)]">{placeholder}</span>
  )}
  </button>

  {/* 下拉面板 */}
  {isOpen && (
  <div className="absolute z-50 w-full mt-2 bg-[color:var(--card)] border border-[color:var(--border)] rounded-xl shadow-lg max-h-96 overflow-hidden popover-entry--tall"
    style={{ transformOrigin: 'top' }}>
  {/* 搜索框 */}
  <div className="p-3 border-b border-[color:var(--border)]">
  <input
  type="text"
  value={searchTerm}
  onChange={e => setSearchTerm(e.target.value)}
  placeholder="搜索单位名称、联系人..."
  className="w-full px-3 py-2 text-sm border border-[color:var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)]"
  autoFocus
  />
  </div>

  {/* 分类筛选 */}
  <div className="p-3 border-b border-[color:var(--border)] flex flex-wrap gap-2">
  <button
  type="button"
  onClick={() => setFilterCategory('all')}
  className={`px-3 py-1 text-xs rounded-full transition-colors ${
  filterCategory === 'all' 
  ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
  : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
  }`}
  >
  全部
  </button>
  {Object.entries(categoryLabels).map(([key, label]) => (
  <button
  key={key}
  type="button"
  onClick={() => setFilterCategory(key)}
  className={`px-3 py-1 text-xs rounded-full transition-colors ${
  filterCategory === key 
  ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
  : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]'
  }`}
  >
  {label}
  </button>
  ))}
  </div>

  {/* 单位列表 */}
  <HoverScrollbar className="max-h-64"><div>
  {Object.keys(groupedPartners).length > 0 ? (
  Object.entries(groupedPartners).map(([category, partners]) => (
  <div key={category}>
  <div className="px-3 py-2 text-xs font-medium text-[color:var(--muted)] bg-[color:var(--panel-2)]">
  {categoryLabels[category] || category} ({partners.length})
  </div>
  {partners.map(partner => (
  <button
  key={partner.id}
  type="button"
  onClick={() => {
  onChange(partner.id)
  setIsOpen(false)
  setSearchTerm('')
  }}
  className={`w-full px-3 py-2 text-left hover:bg-[color:var(--panel-2)] transition-colors flex items-center justify-between ${
  value === partner.id ? 'bg-[color:var(--accent-soft)]' : ''
  }`}
  >
  <div>
  <div className="font-medium text-sm text-[color:var(--fg)]">{partner.name}</div>
  <div className="text-xs text-[color:var(--muted)]">
  {partner.contact && <span>{partner.contact} · </span>}
  {partner.phone}
  </div>
  </div>
  {value === partner.id && (
  <Icon name="Check" size={16} className="text-[color:var(--accent)]" />
  )}
  </button>
  ))}
  </div>
  ))
  ) : (
  <div className="p-4 text-center text-sm text-[color:var(--muted)]">
  未找到匹配的单位
  </div>
  )}
  </div></HoverScrollbar>

  {/* 清空按钮 */}
  {value && (
  <div className="p-3 border-t border-[color:var(--border)]">
  <Button
  type="button"
  onClick={() => {
  onChange(null)
  setIsOpen(false)
  }}
  
   variant="danger" className="w-full">
  清空选择
  </Button>
  </div>
  )}
  </div>
  )}

  {/* 点击外部关闭 */}
  {isOpen && (
  <div 
  className="fixed inset-0 z-40" 
  onClick={() => setIsOpen(false)}
  ></div>
  )}
  </div>
  )
}
