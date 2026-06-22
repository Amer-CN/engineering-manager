import { useState, useMemo, useEffect } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { useConfirm } from '@/hooks/useConfirm'
import { useToastStore } from '@/store/toastStore'
import type { CostLedgerCategory, CostLedgerMatchRule } from '@/types'
import { COLORS } from './costLedgerColors'
import { getLevel1GroupsMerged, HIERARCHY_GROUP_NAMES } from './config'
import { getAPI } from '@/services/api-adapter'
import { LearningRulesView } from './LearningRulesView'
import { CategoryManagerGroupList } from './CategoryManagerGroupList'

interface CategoryManagerProps {
  categories: CostLedgerCategory[]
  onClose: () => void
  onRefresh: () => void
}

export type EditState =
  | { type: 'l1'; group: string; name: string; color: string }
  | { type: 'l2'; id: number; name: string; color: string }
  | null
export type AddState =
  | { type: 'l1'; label: string; color: string; groupName: string; groupColor: string }
  | { type: 'l2'; group: string; label: string; color: string }
  | null

export function CategoryManager({ categories, onClose, onRefresh }: CategoryManagerProps) {
  const { confirm, ConfirmDialog } = useConfirm()
  const showToast = useToastStore(state => state.showToast)
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [viewRules, setViewRules] = useState(false)
  const [edit, setEdit] = useState<EditState>(null)
  const [add, setAdd] = useState<AddState>(null)
  const [error, setError] = useState('')
  const [rules, setRules] = useState<CostLedgerMatchRule[]>([])

  useEffect(() => {
    getAPI().then(api => api?.getCostLedgerMatchRules?.()).then((r: any) => {
      if (r?.success) setRules(r.data || [])
    })
  }, [])

  const filtered = categories.filter(c => c.direction === tab && c.isEnabled !== false)
  const customs = filtered.filter(c => !c.isBuiltin)

  const mergedGroups = useMemo(() => getLevel1GroupsMerged(categories, tab), [tab, categories])
  const hierarchyNames = HIERARCHY_GROUP_NAMES[tab]

  const clearEdit = () => setEdit(null)
  const clearAdd = () => setAdd(null)
  const clearAll = () => { setEdit(null); setAdd(null); setError('') }

  // ── Level 2: edit ──
  const startEditL2 = (cat: CostLedgerCategory) => {
    setEdit({ type: 'l2', id: cat.id, name: cat.label, color: cat.color })
    setError('')
  }
  const saveEditL2 = async () => {
    if (!edit || edit.type !== 'l2') return
    if (!edit.name.trim()) { setError('名称不能为空'); return }
    const api = await getAPI()
    const res = await api.updateCostLedgerCategory(edit.id, { label: edit.name.trim(), color: edit.color })
    if (res?.success) { clearEdit(); onRefresh() } else setError(res?.error || '保存失败')
  }

  // ── Level 1: edit ──
  const startEditL1 = (group: { name: string; color: string }) => {
    setEdit({ type: 'l1', group: group.name, name: group.name, color: group.color })
    setError('')
  }
  const saveEditL1 = async () => {
    if (!edit || edit.type !== 'l1') return
    const oldName = edit.group
    const newName = edit.name.trim()
    if (!newName) { setError('一级分类名不能为空'); return }
    if (newName !== oldName && mergedGroups.some(g => g.name === newName)) {
      setError(`一级分类"${newName}"已存在`); return
    }
    const group = mergedGroups.find(g => g.name === oldName)
    if (!group) { setError('分组不存在'); return }
    const api = await getAPI()
    for (const code of group.codes) {
      const cat = filtered.find(c => c.code === code)
      if (!cat) continue
      const changes: any = { level1: newName }
      if (edit.color !== group.color) changes.color = edit.color
      const res = await api.updateCostLedgerCategory(cat.id, changes)
      if (!res?.success) { setError(res?.error || '更新失败'); return }
    }
    clearEdit(); onRefresh()
  }

  // ── Delete level1 group (custom only) ──
  const handleDeleteL1 = async (group: { name: string; codes: string[] }) => {
    const customCats = group.codes.map(code => customs.find(c => c.code === code)).filter(Boolean) as CostLedgerCategory[]
    if (customCats.length === 0) return
    const ok = await confirm({ title: '确认删除', content: `确定删除一级分类"${group.name}"及其下的 ${customCats.length} 个自定义二级分类？`, confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    for (const cat of customCats) {
      const res = await api.deleteCostLedgerCategory(cat.id)
      if (!res?.success) { showToast(res?.error || '删除失败', 'error'); return }
    }
    onRefresh()
  }

  // ── Delete level2 ──
  const handleDeleteL2 = async (cat: CostLedgerCategory) => {
    const ok = await confirm({ title: '确认删除', content: `确定删除分类"${cat.label}"？已有台账记录引用时不可删除。`, confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    const res = await api.deleteCostLedgerCategory(cat.id)
    if (res?.success) onRefresh()
    else showToast(res?.error || '删除失败', 'error')
  }

  // ── Create level2 under a group ──
  const handleCreateL2 = async () => {
    if (!add || add.type !== 'l2') return
    if (!add.label.trim()) { setError('名称不能为空'); return }
    const api = await getAPI()
    const res = await api.createCostLedgerCategory({
      label: add.label.trim(), direction: tab, color: add.color, level1: add.group,
    })
    if (res?.success) { clearAdd(); setError(''); onRefresh() } else setError(res?.error || '创建失败')
  }

  // ── Create level1 + first level2 ──
  const handleCreateL1 = async () => {
    if (!add || add.type !== 'l1') return
    if (!add.groupName.trim()) { setError('一级分类名不能为空'); return }
    if (mergedGroups.some(g => g.name === add.groupName.trim())) {
      setError(`一级分类"${add.groupName.trim()}"已存在`); return
    }
    if (!add.label.trim()) { setError('二级分类名不能为空'); return }
    const api = await getAPI()
    const res = await api.createCostLedgerCategory({
      label: add.label.trim(), direction: tab, color: add.color, level1: add.groupName.trim(),
    })
    if (res?.success) { clearAdd(); setError(''); onRefresh() } else setError(res?.error || '创建失败')
  }

  // ── Reset ──
  const handleReset = async () => {
    const ok = await confirm({ title: '确认恢复', content: '确定恢复默认分类？这将删除所有自定义分类。', confirmVariant: 'danger' })
    if (!ok) return
    const api = await getAPI()
    const res = await api.resetCostLedgerCategories()
    if (res?.success) onRefresh()
    else showToast(res?.error || '恢复失败', 'error')
  }

  return (
    <Modal isOpen onClose={onClose} title="管理分类" size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <button onClick={handleReset} className="text-xs text-slate-400 hover:text-red-500">恢复默认</button>
          <button onClick={onClose} className="btn btn-secondary btn-sm">关闭</button>
        </div>
      }
    >
      {ConfirmDialog}
      {/* Tabs */}
      <div className="flex border-b border-slate-200 -mx-6 -mt-4 mb-4">
        {(['expense', 'income'] as const).map(t => (
          <button key={t} onClick={() => { setViewRules(false); setTab(t); clearAll() }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              !viewRules && tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t === 'expense' ? '支出分类' : '收入分类'}
          </button>
        ))}
        <button onClick={async () => { setViewRules(true); const api = await getAPI(); const r = await api?.getCostLedgerMatchRules?.(); if (r?.success) setRules(r.data || []) }}
          className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
            viewRules ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >学习规则 ({rules.length})</button>
      </div>

      {/* Body */}
      <div className="space-y-3">
        {error && <p className="rounded bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>}

        {!viewRules && mergedGroups.length > 0 && (
          <CategoryManagerGroupList mergedGroups={mergedGroups} filtered={filtered} customs={customs}
            hierarchyNames={hierarchyNames} edit={edit} add={add} setEdit={setEdit} setAdd={setAdd}
            setError={setError} saveEditL1={saveEditL1} clearEdit={clearEdit} clearAdd={clearAdd}
            startEditL1={startEditL1} handleDeleteL1={handleDeleteL1} handleCreateL2={handleCreateL2}
            handleCreateL1={handleCreateL1} saveEditL2={saveEditL2} startEditL2={startEditL2}
            handleDeleteL2={handleDeleteL2} />
        )}

        {/* ── 学习规则视图 ── */}
        {viewRules && (
          <LearningRulesView rules={rules} categories={categories} confirm={confirm} setRules={setRules} />
        )}

        {/* Create level1 group */}
        {!viewRules && (add?.type === 'l1' ? (
          <div className="space-y-2 rounded-lg border border-blue-300 bg-blue-50/50 px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-caption text-slate-500 w-8">一级</span>
              <input value={add.groupName} onChange={e => setAdd(prev => prev && prev.type === 'l1' ? { ...prev, groupName: e.target.value } : prev)}
                placeholder="一级分类名" className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs" autoFocus />
              <input type="color" value={add.groupColor} onChange={e => setAdd({ ...add, groupColor: e.target.value })}
                className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-caption text-slate-500 w-8">二级</span>
              <input value={add.label} onChange={e => setAdd(prev => prev && prev.type === 'l1' ? { ...prev, label: e.target.value } : prev)}
                placeholder="第一个二级分类名" className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs" />
              <input type="color" value={add.color} onChange={e => setAdd({ ...add, color: e.target.value })}
                className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
              <button onClick={handleCreateL1} className="text-xs font-medium text-blue-600 hover:text-blue-800">创建</button>
              <button onClick={clearAdd} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setAdd({ type: 'l1', groupName: '', groupColor: COLORS.projectReturn, label: '', color: COLORS.publicService }); setEdit(null); setError('') }}
            className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            + 新建一级分类
          </button>
        ))}
      </div>
    </Modal>
  )
}
