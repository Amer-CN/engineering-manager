import type { CostLedgerCategory } from '@/types'
import type { EditState } from './CategoryManager'

interface Props {
  cat: CostLedgerCategory
  edit: EditState
  setEdit: React.Dispatch<React.SetStateAction<EditState>>
  setError: (msg: string) => void
  saveEditL2: () => void
  clearEdit: () => void
  startEditL2: (cat: CostLedgerCategory) => void
  handleDeleteL2: (cat: CostLedgerCategory) => void
}

export function CategoryManagerL2Row({ cat, edit, setEdit, setError, saveEditL2, clearEdit, startEditL2, handleDeleteL2 }: Props) {
  const isEditingL2 = edit?.type === 'l2' && edit.id === cat.id
  return (
    <div className="flex items-center gap-2 pl-5 pr-3 py-1.5 border-b border-slate-50 last:border-0">
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
          {cat.isBuiltin && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-caption text-slate-400">内置</span>}
          <button onClick={() => startEditL2(cat)} className="text-caption text-slate-400 hover:text-blue-600">编辑</button>
          {!cat.isBuiltin && (
            <button onClick={() => handleDeleteL2(cat)} className="text-caption text-slate-400 hover:text-red-500">删除</button>
          )}
        </>
      )}
    </div>
  )
}
