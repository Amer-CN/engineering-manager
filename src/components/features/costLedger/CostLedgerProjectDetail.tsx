import { useState, useEffect, useCallback, useMemo } from 'react'
import { CostLedgerList } from './CostLedgerList'
import { CostLedgerForm } from './CostLedgerForm'
import { CostLedgerBatchBar } from './CostLedgerBatchBar'
import { CostLedgerCompareModal } from './CostLedgerCompareModal'
import { CostLedgerGrid } from './CostLedgerGrid'
import { useCostLedgerBatches } from '@/hooks/useCostLedgerBatches'
import { Icon } from '@/components/ui/Icon'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '@/hooks/useConfirm'
import { CostLedgerImportModal, learnFromEdit } from './CostLedgerImportModal'
import type { CostLedgerEntry, CostLedgerSummary, Project, CostLedgerCategory } from '@/types'
import { getAPI } from '@/services/api-adapter'
import { Button } from '../../ui/Button'

interface CostLedgerProjectDetailProps {
  project: Project
  onBack: () => void
  categories?: CostLedgerCategory[]
  onManageCategories?: () => void
}

// ── Beta 开关：初始模式优先级 ──
// 1) costledger_grid_internal=1 → 内部调试时默认优先进入新 Grid（不禁止切回经典表格）
// 2) costledger_grid_beta_enabled=1 → 用户主动选择新 Grid
// 3) 否则 → 旧表格（默认）
function readGridMode(): 'new' | 'classic' {
  if (typeof window === 'undefined') return 'classic'
  if (localStorage.getItem('costledger_grid_internal') === '1') return 'new'
  if (localStorage.getItem('costledger_grid_beta_enabled') === '1') return 'new'
  return 'classic'
}

function setBetaEnabled(enabled: boolean) {
  if (enabled) localStorage.setItem('costledger_grid_beta_enabled', '1')
  else localStorage.removeItem('costledger_grid_beta_enabled')
}

export function CostLedgerProjectDetail({ project, onBack, categories, onManageCategories }: CostLedgerProjectDetailProps) {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const { batches, createBatch, copyBatch, renameBatch, deleteBatch } = useCostLedgerBatches(project.id)
  const [batchId, setBatchId] = useState<number>(0)
  const [entries, setEntries] = useState<CostLedgerEntry[]>([])
  const [summary, setSummary] = useState<CostLedgerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [showCompare, setShowCompare] = useState(false)
  const [editing, setEditing] = useState<CostLedgerEntry | null>(null)

  // Beta 模式状态
  const [gridMode, setGridMode] = useState<'new' | 'classic'>(readGridMode)
  const isInternalMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('costledger_grid_internal') === '1'
  }, [])

  useEffect(() => {
    if (batches.length > 0 && batchId === 0) {
      const latest = [...batches].sort((a, b) => b.id - a.id).find(b => b.id > 0)
      if (latest) setBatchId(latest.id)
    }
  }, [batches])

  const load = useCallback(async () => {
    const api = await getAPI()
    if (!api?.getCostLedger) return
    setLoading(true)
    setLoadError(null)
    const [listRes, summaryRes] = await Promise.allSettled([
      api.getCostLedger(project.id, batchId),
      api.getCostLedgerSummary(project.id, batchId),
    ])
    if (listRes.status === 'fulfilled') {
      if (listRes.value?.success) {
        setEntries(listRes.value.data || [])
      } else {
        setEntries([])
        setLoadError(listRes.value?.error || '加载台账列表失败')
      }
    } else {
      setEntries([])
      setLoadError(listRes.reason?.message || '加载台账列表失败')
    }
    if (summaryRes.status === 'fulfilled') {
      if (summaryRes.value?.success) {
        setSummary(summaryRes.value.data || null)
      } else {
        setSummary(null)
      }
    } else {
      setSummary(null)
    }
    setLoading(false)
  }, [project.id, batchId])

  useEffect(() => { load() }, [load])

  const handleSave = async (data: any) => {
    const api = await getAPI()
    if (editing) {
      const res = await api.updateCostLedger(editing.id, data)
      if (res?.success) {
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
        if (res.warning) showToast(res.warning, 'warning')
        setShowForm(false)
        load()
      } else {
        showToast(res?.error || '创建失败', 'error')
      }
    }
  }

  const handleDelete = async (id: number) => {
    const api = await getAPI()
    const ok = await confirm({ title: '确认删除', content: '确认删除这条台账记录？', confirmVariant: 'danger' })
    if (!ok) return
    const res = await api.deleteCostLedger(id)
    if (res?.success) load()
  }

  // 切换 Grid 模式
  const handleSwitchGrid = (mode: 'new' | 'classic') => {
    if (mode === gridMode) return
    setGridMode(mode)
    setBetaEnabled(mode === 'new')
    showToast(mode === 'new' ? '已切换到新表格 Beta' : '已切回经典表格', 'success')
  }

  return (
    <div className="flex h-full flex-col">
      {ConfirmDialog}
      {/* 头部：返回 + 项目名 */}
      <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]">
          <Icon name="ArrowLeft" size={16} />
          <span>返回台账总览</span>
        </button>
        <span className="w-1.5 h-8 rounded-full" style={{ background: 'var(--accent)' }} />
        <div>
          <h2 className="text-base font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>{project.name}</h2>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>成本台账</p>
        </div>
        <div className="flex-1" />

        {/* Beta 切换入口 — 低调但明确 */}
        <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'var(--panel-2)' }}>
          <button
            onClick={() => handleSwitchGrid('classic')}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
            style={gridMode === 'classic' ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}
          >
            经典表格
          </button>
          <button
            onClick={() => handleSwitchGrid('new')}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors flex items-center gap-1"
            style={gridMode === 'new' ? { background: 'var(--card)', color: 'var(--fg)', boxShadow: 'var(--shadow-card)' } : { background: 'transparent', color: 'var(--muted)' }}
          >
            新表格
            <span className="rounded px-1 py-0.5 text-caption font-semibold" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>Beta</span>
          </button>
        </div>

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
        <Button onClick={() => { setEditing(null); setShowForm(true) }}  variant="primary" size="sm">
          + 新增台账
        </Button>
      </div>

      {/* Beta 提示条 — 仅在新 Grid 模式下显示 */}
      {gridMode === 'new' && (
        <div className="flex items-center gap-2 px-6 py-2 text-xs" style={{ color: 'var(--fg-2)', background: 'var(--panel-2)', borderBottom: '1px solid var(--border)' }}>
          <Icon name="Info" size={14} />
          <span>你正在使用<strong>新表格 Beta</strong>，可随时切回经典表格。导入/导出/打印请暂用经典表格。</span>
          {isInternalMode && <span className="ml-1 rounded px-1 py-0.5 text-caption" style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>内部调试</span>}
          <button
            onClick={() => handleSwitchGrid('classic')}
            className="ml-auto rounded-md px-2 py-0.5 text-xs font-medium transition-colors hover:bg-[color:var(--panel-2)]"
            style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}
          >
            切回经典表格
          </button>
        </div>
      )}

      {/* 内容区 */}
      <div className="flex-1 min-h-0 flex flex-col">
        {gridMode === 'new' ? (
          <CostLedgerGrid
            key={batchId}
            rows={entries}
            loading={loading}
            error={loadError}
            categories={categories}
            onEdit={(e) => { setEditing(e); setShowForm(true) }}
            onChanged={load}
          />
        ) : (
          <CostLedgerList
            key={batchId}
            entries={entries}
            summary={summary}
            loading={loading}
            onEdit={(e) => { setEditing(e); setShowForm(true) }}
            onDelete={handleDelete}
            categories={categories}
          />
        )}
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
