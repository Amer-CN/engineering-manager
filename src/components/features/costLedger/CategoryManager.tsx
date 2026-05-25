import { useState, useMemo, useEffect } from 'react'
import type { CostLedgerCategory, CostLedgerMatchRule } from '@/types'
import { getLevel1GroupsMerged, HIERARCHY_GROUP_NAMES } from './config'

interface CategoryManagerProps {
  categories: CostLedgerCategory[]
  onClose: () => void
  onRefresh: () => void
}

type EditState =
  | { type: 'l1'; group: string; name: string; color: string }
  | { type: 'l2'; id: number; name: string; color: string }
  | null
type AddState =
  | { type: 'l1'; label: string; color: string; groupName: string; groupColor: string }
  | { type: 'l2'; group: string; label: string; color: string }
  | null

export function CategoryManager({ categories, onClose, onRefresh }: CategoryManagerProps) {
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [viewRules, setViewRules] = useState(false)
  const [edit, setEdit] = useState<EditState>(null)
  const [add, setAdd] = useState<AddState>(null)
  const [error, setError] = useState('')
  const [rules, setRules] = useState<CostLedgerMatchRule[]>([])

  useEffect(() => {
    const api = window.electronAPI
    api?.getCostLedgerMatchRules?.().then((r: any) => {
      if (r?.success) setRules(r.data || [])
    })
  }, [])

  const api = window.electronAPI
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
    if (!confirm(`确定删除一级分类"${group.name}"及其下的 ${customCats.length} 个自定义二级分类？`)) return
    for (const cat of customCats) {
      const res = await api.deleteCostLedgerCategory(cat.id)
      if (!res?.success) { alert(res?.error || '删除失败'); return }
    }
    onRefresh()
  }

  // ── Delete level2 ──
  const handleDeleteL2 = async (cat: CostLedgerCategory) => {
    if (!confirm(`确定删除分类"${cat.label}"？已有台账记录引用时不可删除。`)) return
    const res = await api.deleteCostLedgerCategory(cat.id)
    if (res?.success) onRefresh()
    else alert(res?.error || '删除失败')
  }

  // ── Create level2 under a group ──
  const handleCreateL2 = async () => {
    if (!add || add.type !== 'l2') return
    if (!add.label.trim()) { setError('名称不能为空'); return }
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
    const res = await api.createCostLedgerCategory({
      label: add.label.trim(), direction: tab, color: add.color, level1: add.groupName.trim(),
    })
    if (res?.success) { clearAdd(); setError(''); onRefresh() } else setError(res?.error || '创建失败')
  }

  // ── Reset ──
  const handleReset = async () => {
    if (!confirm('确定恢复默认分类？这将删除所有自定义分类。')) return
    const res = await api.resetCostLedgerCategories()
    if (res?.success) onRefresh()
    else alert(res?.error || '恢复失败')
  }

  const isCustomGroup = (group: { name: string; codes: string[] }) =>
    group.codes.every(code => { const cat = filtered.find(c => c.code === code); return cat && !cat.isBuiltin })

  const isHierarchyGroup = (name: string) => hierarchyNames.includes(name)

  // ── Render level2 row ──
  const renderL2Row = (cat: CostLedgerCategory) => {
    const isEditingL2 = edit?.type === 'l2' && edit.id === cat.id
    return (
      <div key={cat.id} className="flex items-center gap-2 pl-5 pr-3 py-1.5 border-b border-slate-50 last:border-0">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
        {isEditingL2 ? (
          <>
            <input value={edit.name} onChange={e => setEdit(prev => prev && prev.type === 'l2' ? { ...prev, name: e.target.value } : prev)}
              className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-xs" autoFocus />
            <input type="color" value={edit.color} onChange={e => setEdit({ ...edit, color: e.target.value })}
              className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
            <button onClick={saveEditL2} className="text-xs text-blue-600 hover:text-blue-800">保存</button>
            <button onClick={clearEdit} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm text-slate-700">{cat.label}</span>
            {cat.isBuiltin && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">内置</span>}
            <button onClick={() => startEditL2(cat)} className="text-[10px] text-slate-400 hover:text-blue-600">编辑</button>
            {!cat.isBuiltin && (
              <button onClick={() => handleDeleteL2(cat)} className="text-[10px] text-slate-400 hover:text-red-500">删除</button>
            )}
          </>
        )}
      </div>
    )
  }

// @ts-ignore TS6133: tabLabel is declared but never read
  const tabLabel = tab === 'expense' ? '支出分类' : '收入分类'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-6 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">管理分类</h2>
          <button onClick={onClose} className="btn btn-ghost p-1">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => { setViewRules(false); setTab(t); clearAll() }}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                !viewRules && tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'expense' ? '支出分类' : '收入分类'}
            </button>
          ))}
          <button onClick={async () => { setViewRules(true); const api = window.electronAPI; const r = await api?.getCostLedgerMatchRules?.(); if (r?.success) setRules(r.data || []) }}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              viewRules ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
            }`}
          >学习规则 ({rules.length})</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[440px] overflow-y-auto">
          {error && <p className="rounded bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>}

          {!viewRules && mergedGroups.length > 0 && (
            <div className="space-y-2">
              {mergedGroups.map(group => {
                const groupCats = filtered.filter(c => group.codes.includes(c.code))
                if (groupCats.length === 0 && !isHierarchyGroup(group.name)) return null
                const custom = isCustomGroup(group)
                const isEditingL1 = edit?.type === 'l1' && edit.group === group.name

                return (
                  <div key={group.name} className="rounded-lg border border-slate-200 overflow-hidden">
                    {/* Level 1 header */}
                    {isEditingL1 ? (
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: edit.color }} />
                        <input value={edit.name} onChange={e => setEdit(prev => prev && prev.type === 'l1' ? { ...prev, name: e.target.value } : prev)}
                          className="flex-1 rounded border border-slate-300 px-2 py-0.5 text-sm font-medium" autoFocus />
                        <input type="color" value={edit.color} onChange={e => setEdit({ ...edit, color: e.target.value })}
                          className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
                        <button onClick={saveEditL1} className="text-xs text-blue-600 hover:text-blue-800">保存</button>
                        <button onClick={clearEdit} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                        <span className="flex-1 text-sm font-semibold text-slate-800">{group.name}</span>
                        {isHierarchyGroup(group.name) && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">内置</span>}
                        <button onClick={() => startEditL1(group)}
                          className="text-[10px] text-slate-400 hover:text-blue-600">编辑</button>
                        {custom && (
                          <button onClick={() => handleDeleteL1(group)}
                            className="text-[10px] text-slate-400 hover:text-red-500">删除</button>
                        )}
                      </div>
                    )}

                    {/* Level 2 items */}
                    {groupCats.length > 0 ? (
                      <div>{groupCats.map(cat => renderL2Row(cat))}</div>
                    ) : (
                      <div className="px-3 py-3 text-center text-xs text-slate-400">暂无二级分类</div>
                    )}

                    {/* Add level2 */}
                    {add?.type === 'l2' && add.group === group.name ? (
                      <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-100 bg-blue-50/30">
                        <input value={add.label} onChange={e => setAdd(prev => prev && prev.type === 'l2' ? { ...prev, label: e.target.value } : prev)}
                          placeholder="二级分类名" className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs" autoFocus />
                        <input type="color" value={add.color} onChange={e => setAdd({ ...add, color: e.target.value })}
                          className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
                        <button onClick={handleCreateL2} className="text-xs font-medium text-blue-600 hover:text-blue-800">添加</button>
                        <button onClick={clearAdd} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAdd({ type: 'l2', group: group.name, label: '', color: '#6b7280' }); setEdit(null); setError('') }}
                        className="w-full px-3 py-1.5 text-xs text-slate-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors"
                      >
                        + 添加二级
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── 学习规则视图 ── */}
          {viewRules && (
            <div className="space-y-1">
              {rules.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">暂无学习规则</p>
              ) : (
                <div className="space-y-0.5">
                  {rules.map((rule, i) => {
                    const cat = categories.find(c => c.code === rule.category && c.direction === rule.direction)
                    return (
                      <div key={i} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs hover:bg-slate-50">
                        <span className="font-mono text-slate-800 min-w-[80px]">{rule.keyword}</span>
                        <span className="text-slate-300">→</span>
                        <span className={`rounded px-1.5 py-0.5 font-medium ${rule.direction === 'expense' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {cat?.label || rule.category}
                        </span>
                        <span className="text-slate-300 ml-auto">命中 {rule.hitCount} 次</span>
                        <button onClick={async () => {
                          const api = window.electronAPI
                          const remaining = rules.filter((_, j) => j !== i)
                          const res = await api.saveCostLedgerMatchRules(remaining)
                          if (res?.success) setRules(remaining)
                        }} className="btn btn-danger btn-sm">✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
              {rules.length > 0 && (
                <button onClick={async () => {
                  if (!confirm('确定清空所有学习规则？')) return
                  const api = window.electronAPI
                  const res = await api.saveCostLedgerMatchRules([])
                  if (res?.success) setRules([])
                }}
                  className="mt-3 w-full rounded-lg border border-dashed border-red-200 px-3 py-2 text-xs text-red-400 hover:border-red-400 hover:text-red-600 transition-colors"
                >清空所有学习规则</button>
              )}
            </div>
          )}

          {/* Create level1 group */}
          {!viewRules && (add?.type === 'l1' ? (
            <div className="space-y-2 rounded-lg border border-blue-300 bg-blue-50/50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-8">一级</span>
                <input value={add.groupName} onChange={e => setAdd(prev => prev && prev.type === 'l1' ? { ...prev, groupName: e.target.value } : prev)}
                  placeholder="一级分类名" className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs" autoFocus />
                <input type="color" value={add.groupColor} onChange={e => setAdd({ ...add, groupColor: e.target.value })}
                  className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-8">二级</span>
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
              onClick={() => { setAdd({ type: 'l1', groupName: '', groupColor: '#6366f1', label: '', color: '#6b7280' }); setEdit(null); setError('') }}
              className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              + 新建一级分类
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-between border-t border-slate-200 px-5 py-3">
          <button onClick={handleReset}
            className="text-xs text-slate-400 hover:text-red-500">
            恢复默认
          </button>
          <button onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-200">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
