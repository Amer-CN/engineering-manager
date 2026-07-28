import type { CostLedgerCategory } from '@/types'
import type { EditState, AddState } from './CategoryManager'
import { CategoryManagerL2Row } from './CategoryManagerL2Row'
import { COLORS } from './costLedgerColors'

interface MergedGroup {
  name: string
  color: string
  codes: string[]
}

interface Props {
  mergedGroups: MergedGroup[]
  filtered: CostLedgerCategory[]
  customs: CostLedgerCategory[]
  hierarchyNames: string[]
  edit: EditState
  add: AddState
  setEdit: React.Dispatch<React.SetStateAction<EditState>>
  setAdd: React.Dispatch<React.SetStateAction<AddState>>
  setError: (msg: string) => void
  saveEditL1: () => void
  clearEdit: () => void
  clearAdd: () => void
  startEditL1: (group: { name: string; color: string }) => void
  handleDeleteL1: (group: { name: string; codes: string[] }) => void
  handleCreateL2: () => void
  handleCreateL1: () => void
  saveEditL2: () => void
  startEditL2: (cat: CostLedgerCategory) => void
  handleDeleteL2: (cat: CostLedgerCategory) => void
}

const isCustomGroup = (group: MergedGroup, filtered: CostLedgerCategory[]) =>
  group.codes.every(code => { const cat = filtered.find(c => c.code === code); return cat && !cat.isBuiltin })

export function CategoryManagerGroupList({
  mergedGroups, filtered, customs, hierarchyNames, edit, add,
  setEdit, setAdd, setError, saveEditL1, clearEdit, clearAdd,
  startEditL1, handleDeleteL1, handleCreateL2, handleCreateL1,
  saveEditL2, startEditL2, handleDeleteL2,
}: Props) {
  return (
    <div className="space-y-2">
      {mergedGroups.map(group => {
        const groupCats = filtered.filter(c => group.codes.includes(c.code))
        if (groupCats.length === 0 && !hierarchyNames.includes(group.name)) return null
        const custom = isCustomGroup(group, filtered)
        const isEditingL1 = edit?.type === 'l1' && edit.group === group.name

        return (
          <div key={group.name} className="rounded-lg border border-[color:var(--border)] overflow-hidden">
            {isEditingL1 ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[color:var(--panel-2)] border-b border-[color:var(--border)]">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: edit.color }} />
                <input value={edit.name} onChange={e => setEdit(prev => prev && prev.type === 'l1' ? { ...prev, name: e.target.value } : prev)}
                  className="flex-1 rounded border border-[color:var(--border)] px-2 py-0.5 text-sm font-medium" autoFocus />
                <input type="color" value={edit.color} onChange={e => setEdit({ ...edit, color: e.target.value })}
                  className="h-5 w-6 rounded border border-[color:var(--border)] p-0 cursor-pointer" />
                <button onClick={saveEditL1} className="text-xs text-[color:var(--accent)] hover:opacity-80">保存</button>
                <button onClick={clearEdit} className="text-xs text-[color:var(--muted)] hover:text-[color:var(--fg-2)]">取消</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-2 bg-[color:var(--panel-2)]">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                <span className="flex-1 text-sm font-semibold text-[color:var(--fg)]">{group.name}</span>
                {hierarchyNames.includes(group.name) && <span className="rounded bg-[color:var(--panel-2)] px-1.5 py-0.5 text-caption text-[color:var(--muted)]">内置</span>}
                <button onClick={() => startEditL1(group)}
                  className="text-caption text-[color:var(--muted)] hover:text-[color:var(--accent)]">编辑</button>
                {custom && (
                  <button onClick={() => handleDeleteL1(group)}
                    className="text-caption text-[color:var(--muted)] hover:text-danger-500">删除</button>
                )}
              </div>
            )}

            {groupCats.length > 0 ? (
              <div>{groupCats.map(cat => (
                <CategoryManagerL2Row key={cat.id} cat={cat} edit={edit} setEdit={setEdit} setError={setError}
                  saveEditL2={saveEditL2} clearEdit={clearEdit} startEditL2={startEditL2} handleDeleteL2={handleDeleteL2} />
              ))}</div>
            ) : (
              <div className="px-3 py-3 text-center text-xs text-[color:var(--muted)]">暂无二级分类</div>
            )}

            {add?.type === 'l2' && add.group === group.name ? (
              <div className="flex items-center gap-2 px-3 py-2 border-t border-[color:var(--border)] bg-[color:var(--accent-soft)]">
                <input value={add.label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAdd(prev => prev && prev.type === 'l2' ? { ...prev, label: e.target.value } : prev)}
                  placeholder="二级分类名" className="flex-1 rounded border border-[color:var(--border)] px-2 py-1 text-xs" autoFocus />
                <input type="color" value={add.color} onChange={e => setAdd({ ...add, color: e.target.value })}
                  className="h-5 w-6 rounded border border-[color:var(--border)] p-0 cursor-pointer" />
                <button onClick={handleCreateL2} className="text-xs font-medium text-[color:var(--accent)] hover:opacity-80">添加</button>
                <button onClick={clearAdd} className="text-xs text-[color:var(--muted)] hover:text-[color:var(--fg-2)]">取消</button>
              </div>
            ) : (
              <button
                onClick={() => { setAdd({ type: 'l2', group: group.name, label: '', color: COLORS.publicService }); setEdit(null); setError('') }}
                className="w-full px-3 py-1.5 text-xs text-[color:var(--muted)] hover:text-[color:var(--accent)] hover:bg-[color:var(--accent-soft)] transition-colors"
              >
                + 添加二级
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
