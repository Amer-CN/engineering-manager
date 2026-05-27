import { useState, useEffect, useCallback } from 'react'
import { CostLedgerList } from './CostLedgerList'
import { CostLedgerForm } from './CostLedgerForm'
import { CostLedgerBatchBar } from './CostLedgerBatchBar'
import { CostLedgerCompareModal } from './CostLedgerCompareModal'
import { useCostLedgerCategories } from '@/hooks/useCostLedgerCategories'
import { useCostLedgerBatches } from '@/hooks/useCostLedgerBatches'
import { useToastStore } from '@/store/toastStore'
import { CostLedgerImportModal, learnFromEdit } from './CostLedgerImportModal'
import { logCreate, logUpdate, logDelete } from '@/utils/audit'
import type { CostLedgerEntry, CostLedgerSummary } from '@/types'

interface CostLedgerTabProps {
  projectId: number
  projectName?: string
}

export function CostLedgerTab({ projectId, projectName }: CostLedgerTabProps) {
  const showToast = useToastStore(state => state.showToast)
  const { categories } = useCostLedgerCategories()
  const { batches, createBatch, copyBatch, renameBatch, deleteBatch, reload: reloadBatches } = useCostLedgerBatches(projectId)
  // 默认取最新有数据的版本（非初始版），后端 getLatestBatch 决定
  const [batchId, setBatchId] = useState<number>(0)
  const [entries, setEntries] = useState<CostLedgerEntry[]>([])
  const [summary, setSummary] = useState<CostLedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [editing, setEditing] = useState<CostLedgerEntry | null>(null)

  const api = window.electronAPI

  // 版本列表加载后，自动切换到最新非初始版（仅首次）
  useEffect(() => {
    if (batches.length > 0 && batchId === 0) {
      const latest = [...batches].sort((a, b) => b.id - a.id).find(b => b.id > 0)
      if (latest) setBatchId(latest.id)
    }
  }, [batches])

  const load = useCallback(async () => {
    if (!api?.getCostLedger) return
    setLoading(true)
    const [listRes, summaryRes] = await Promise.allSettled([
      api.getCostLedger(projectId, batchId),
      api.getCostLedgerSummary(projectId, batchId),
    ])
    if (listRes.status === 'fulfilled' && listRes.value?.success) setEntries(listRes.value.data || [])
    if (summaryRes.status === 'fulfilled' && summaryRes.value?.success) setSummary(summaryRes.value.data || null)
    setLoading(false)
  }, [projectId, batchId])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: any) => {
    if (editing) {
      const res = await api.updateCostLedger(editing.id, data)
      if (res?.success) {
        // 分类改变时自动学习
        if (editing.category !== data.category) {
          const n = await learnFromEdit(data.summary || '', data.counterparty || '', data.notes || '', data.category, data.direction)
          if (n > 0) showToast(`已学习 ${n} 条分类规则`, 'success')
        } else {
          showToast('台账已保存', 'success')
        }
        setShowForm(false); setEditing(null); load(); logUpdate('costLedger', data.name || '台账', editing.id, {})
      } else {
        showToast(res?.error || '保存失败', 'error')
      }
    } else {
      const res = await api.createCostLedger({ ...data, batchId })
      if (res?.success) {
        if (res.warning) alert(res.warning)
        setShowForm(false)
        load()
        logCreate('costLedger', data.name || '台账', null as any, { projectId })
      } else {
        showToast(res?.error || '创建失败', 'error')
      }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确认删除这条台账记录？')) return
    const res = await api.deleteCostLedger(id)
    if (res?.success) { load(); logDelete('costLedger', `台账 #${id}`, id, { projectId }) }
  }

  const openNew = () => { setEditing(null); setShowForm(true) }
  const openEdit = (entry: CostLedgerEntry) => { setEditing(entry); setShowForm(true) }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
        <h3 className="text-sm font-semibold text-slate-700">成本台账</h3>
        <div className="flex items-center gap-3">
          <CostLedgerBatchBar
            batches={batches}
            currentBatchId={batchId}
            onChangeBatch={setBatchId}
            onCreateBatch={createBatch}
            onCopyBatch={async (sourceBatchId, name) => {
              const b = await copyBatch(sourceBatchId, name)
              if (b) setBatchId(b.id)
              return b
            }}
            onRenameBatch={renameBatch}
            onDeleteBatch={deleteBatch}
            onImport={() => setShowImport(true)}
            onCompare={() => setShowCompare(true)}
          />
          <button onClick={openNew} className="btn btn-primary btn-sm">
            + 新增
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <CostLedgerList key={batchId} entries={entries} summary={summary} loading={loading} onEdit={openEdit} onDelete={handleDelete} categories={categories} />
      </div>
      {showForm && (
        <CostLedgerForm
          projectId={projectId}
          projectName={projectName}
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          categories={categories}
        />
      )}
      {showImport && <CostLedgerImportModal
        key={'import-' + batchId}
        show={true}
        projectId={projectId}
        projectName={projectName}
        batchId={batchId}
        batches={batches}
        categories={categories}
        onClose={() => setShowImport(false)}
        onImported={() => { load(); reloadBatches() }}
      />}
      <CostLedgerCompareModal
        show={showCompare}
        projectId={projectId}
        batches={batches}
        categories={categories}
        onClose={() => setShowCompare(false)}
      />
    </div>
  )
}
