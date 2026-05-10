import { useState, useEffect, useCallback } from 'react'
import { CostLedgerList } from './CostLedgerList'
import { CostLedgerForm } from './CostLedgerForm'
import { getCategoryLabel } from './config'
import { formatMoney } from '@/utils/format'
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
      {/* 顶部栏 */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-slate-400 hover:text-slate-600">← 返回</button>
          <h2 className="text-base font-semibold text-slate-800">{project.name}</h2>
          <span className="text-xs text-slate-400">成本台账</span>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          + 新增
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto">
        <CostLedgerList
          entries={entries}
          summary={summary}
          loading={loading}
          onEdit={(e) => { setEditing(e); setShowForm(true) }}
          onDelete={handleDelete}
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
