import { useState, useEffect, useCallback } from 'react'
import { CostLedgerList } from './CostLedgerList'
import { CostLedgerForm } from './CostLedgerForm'
import { CostLedgerBatchBar } from './CostLedgerBatchBar'
import { CostLedgerCompareModal } from './CostLedgerCompareModal'
import { useCostLedgerBatches } from '@/hooks/useCostLedgerBatches'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'
import { CostLedgerImportModal, learnFromEdit } from './CostLedgerImportModal'
import type { CostLedgerEntry, CostLedgerSummary, Project, CostLedgerCategory } from '@/types'

interface CostLedgerProjectDetailProps {
  project: Project
  onBack: () => void
  categories?: CostLedgerCategory[]
  onManageCategories?: () => void
}

export function CostLedgerProjectDetail({ project, onBack, categories, onManageCategories }: CostLedgerProjectDetailProps) {
  const showToast = useToastStore(state => state.showToast)
  const { batches, createBatch, copyBatch, renameBatch, deleteBatch } = useCostLedgerBatches(project.id)
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
    const [listRes, summaryRes] = await Promise.all([
      api.getCostLedger(project.id, batchId),
      api.getCostLedgerSummary(project.id, batchId),
    ])
    if (listRes?.success) setEntries(listRes.data || [])
    if (summaryRes?.success) setSummary(summaryRes.data || null)
    setLoading(false)
  }, [project.id, batchId])

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
        setShowForm(false); setEditing(null); load()
      } else {
        showToast(res?.error || '保存失败', 'error')
      }
    } else {
      const res = await api.createCostLedger({ ...data, batchId })
      if (res?.success) {
        if (res.warning) alert(res.warning)
        setShowForm(false)
        load()
      } else {
        showToast(res?.error || '创建失败', 'error')
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
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn btn-primary btn-sm">
          + 新增台账
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <CostLedgerList key={batchId}
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
      {showImport && <CostLedgerImportModal
        show={true}
        projectId={project.id}
        projectName={project.name}
        batchId={batchId}
        batches={batches}
        categories={categories || []}
        onClose={() => setShowImport(false)}
        onImported={load}
      />}
      <CostLedgerCompareModal
        show={showCompare}
        projectId={project.id}
        batches={batches}
        categories={categories}
        onClose={() => setShowCompare(false)}
      />
    </div>
  )
}
