import { useState, useEffect, useCallback } from 'react'
import { CostLedgerList } from './CostLedgerList'
import { CostLedgerForm } from './CostLedgerForm'
import { getCategoryLabel } from './config'
import { formatMoney } from '@/utils/format'
import { Icon } from '@/components/ui/Icon'
import type { CostLedgerEntry, CostLedgerSummary, Project, CostLedgerCategory } from '@/types'

interface CostLedgerProjectDetailProps {
  project: Project
  onBack: () => void
  categories?: CostLedgerCategory[]
  onManageCategories?: () => void
}

export function CostLedgerProjectDetail({ project, onBack, categories, onManageCategories }: CostLedgerProjectDetailProps) {
  const [entries, setEntries] = useState<CostLedgerEntry[]>([])
  const [summary, setSummary] = useState<CostLedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CostLedgerEntry | null>(null)

  const api = (window as any).electronAPI

  const load = useCallback(async () => {
    if (!api?.getCostLedger) return
    setLoading(true)
    const [listRes, summaryRes] = await Promise.all([
      api.getCostLedger(project.id),
      api.getCostLedgerSummary(project.id),
    ])
    if (listRes?.success) setEntries(listRes.data || [])
    if (summaryRes?.success) setSummary(summaryRes.data || null)
    setLoading(false)
  }, [project.id])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: any) => {
    if (editing) {
      const res = await api.updateCostLedger(editing.id, data)
      if (res?.success) { setShowForm(false); setEditing(null); load() }
    } else {
      const res = await api.createCostLedger(data)
      if (res?.success) {
        if (res.warning) alert(res.warning)
        setShowForm(false)
        load()
      }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除这条台账记录？')) return
    const res = await api.deleteCostLedger(id)
    if (res?.success) load()
  }

  return (
    <div className="flex h-full flex-col">
      {/* 头部：返回 + 项目名 */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors">
          <Icon name="ArrowLeft" size={16} />
          <span>返回台账总览</span>
        </button>
        <span className="w-1.5 h-8 rounded-full bg-amber-500" />
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{project.name}</h2>
          <p className="text-sm text-slate-500">成本台账</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          + 新增台账
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <CostLedgerList
          entries={entries}
          summary={summary}
          loading={loading}
          onEdit={(e) => { setEditing(e); setShowForm(true) }}
          onDelete={handleDelete}
          categories={categories}
        />
      </div>

      {showForm && (
        <CostLedgerForm
          projectId={project.id}
          projectName={project.name}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          categories={categories}
          onManageCategories={onManageCategories}
        />
      )}
    </div>
  )
}
