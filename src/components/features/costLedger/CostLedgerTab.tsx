import { useState, useEffect, useCallback } from 'react'
import { CostLedgerList } from './CostLedgerList'
import { CostLedgerForm } from './CostLedgerForm'
import type { CostLedgerEntry, CostLedgerSummary } from '@/types'

interface CostLedgerTabProps {
  projectId: number
  projectName?: string
}

export function CostLedgerTab({ projectId, projectName }: CostLedgerTabProps) {
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
      api.getCostLedger(projectId),
      api.getCostLedgerSummary(projectId),
    ])
    if (listRes?.success) setEntries(listRes.data || [])
    if (summaryRes?.success) setSummary(summaryRes.data || null)
    setLoading(false)
  }, [projectId])

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

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (entry: CostLedgerEntry) => { setEditing(entry); setShowForm(true) }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <h3 className="text-sm font-semibold text-slate-700">成本台账</h3>
        <button onClick={openNew} className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          + 新增
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <CostLedgerList entries={entries} summary={summary} loading={loading} onEdit={openEdit} onDelete={handleDelete} />
      </div>
      {showForm && (
        <CostLedgerForm
          projectId={projectId}
          projectName={projectName}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
