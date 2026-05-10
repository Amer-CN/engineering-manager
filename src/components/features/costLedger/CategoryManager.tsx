import { useState } from 'react'
import type { CostLedgerCategory } from '@/types'

interface CategoryManagerProps {
  categories: CostLedgerCategory[]
  onClose: () => void
  onRefresh: () => void
}

export function CategoryManager({ categories, onClose, onRefresh }: CategoryManagerProps) {
  const [tab, setTab] = useState<'expense' | 'income'>('expense')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#6b7280')
  const [error, setError] = useState('')

  const api = (window as any).electronAPI
  const filtered = categories.filter(c => c.direction === tab && c.isEnabled !== false)
  const builtins = filtered.filter(c => c.isBuiltin)
  const customs = filtered.filter(c => !c.isBuiltin)

  const startEdit = (cat: CostLedgerCategory) => {
    setEditingId(cat.id)
    setEditLabel(cat.label)
    setEditColor(cat.color)
    setError('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditLabel('')
    setEditColor('')
    setError('')
  }

  const saveEdit = async () => {
    if (!editLabel.trim()) { setError('名称不能为空'); return }
    const res = await api.updateCostLedgerCategory(editingId, { label: editLabel.trim(), color: editColor })
    if (res?.success) { cancelEdit(); onRefresh() }
    else setError(res?.error || '保存失败')
  }

  const handleDelete = async (cat: CostLedgerCategory) => {
    if (!confirm(`确定删除分类"${cat.label}"？${cat.isBuiltin ? '' : '已有台账记录引用时不可删除。'}`)) return
    const res = await api.deleteCostLedgerCategory(cat.id)
    if (res?.success) onRefresh()
    else alert(res?.error || '删除失败')
  }

  const handleCreate = async () => {
    if (!newLabel.trim()) { setError('名称不能为空'); return }
    const res = await api.createCostLedgerCategory({ label: newLabel.trim(), direction: tab, color: newColor })
    if (res?.success) { setNewLabel(''); setNewColor('#6b7280'); setAdding(false); setError(''); onRefresh() }
    else setError(res?.error || '创建失败')
  }

  const handleReset = async () => {
    if (!confirm('确定恢复默认分类？这将删除所有自定义分类。')) return
    const res = await api.resetCostLedgerCategories()
    if (res?.success) onRefresh()
    else alert(res?.error || '恢复失败')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 p-6 pt-16">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">管理分类</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          {(['expense', 'income'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); cancelEdit(); setAdding(false); setError('') }}
              className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {t === 'expense' ? '支出分类' : '收入分类'}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3 max-h-[420px] overflow-y-auto">
          {error && <p className="rounded bg-red-50 px-3 py-1.5 text-xs text-red-600">{error}</p>}

          {/* Builtin list */}
          {builtins.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-slate-400">内置分类</p>
              <div className="space-y-1">
                {builtins.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                    {editingId === cat.id ? (
                      <>
                        <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                          className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-xs" autoFocus />
                        <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                          className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
                        <button onClick={saveEdit} className="text-xs text-blue-600 hover:text-blue-800">保存</button>
                        <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-slate-700">{cat.label}</span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400">内置</span>
                        <button onClick={() => startEdit(cat)}
                          className="text-[10px] text-slate-400 hover:text-blue-600">编辑</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom list */}
          {customs.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase text-slate-400">自定义分类</p>
              <div className="space-y-1">
                {customs.map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
                    {editingId === cat.id ? (
                      <>
                        <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                          className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-xs" autoFocus />
                        <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)}
                          className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
                        <button onClick={saveEdit} className="text-xs text-blue-600 hover:text-blue-800">保存</button>
                        <button onClick={cancelEdit} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-slate-700">{cat.label}</span>
                        <button onClick={() => startEdit(cat)}
                          className="text-[10px] text-slate-400 hover:text-blue-600">编辑</button>
                        <button onClick={() => handleDelete(cat)}
                          className="text-[10px] text-slate-400 hover:text-red-500">删除</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">暂无分类</p>
          )}

          {/* Add new */}
          {adding ? (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/50 px-3 py-2">
              <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="分类名称" className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs" autoFocus />
              <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)}
                className="h-5 w-6 rounded border border-slate-200 p-0 cursor-pointer" />
              <button onClick={handleCreate} className="text-xs font-medium text-blue-600 hover:text-blue-800">添加</button>
              <button onClick={() => { setAdding(false); setError('') }} className="text-xs text-slate-400 hover:text-slate-600">取消</button>
            </div>
          ) : (
            <button onClick={() => { setAdding(true); cancelEdit() }}
              className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:border-slate-400 hover:text-slate-700">
              + 新建分类
            </button>
          )}
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
