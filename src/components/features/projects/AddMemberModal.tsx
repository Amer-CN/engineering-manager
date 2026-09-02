import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import type { Member } from '@/types'

export function AddMemberModal({ members, onAdd, onClose }: {
  members: Member[]; onAdd: (memberId: number, joinedAt?: string) => Promise<{ success: boolean; error?: string }>; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState<number | null>(null)
  const [error, setError] = useState('')
  const filtered = members.filter(m => !search || m.name.includes(search) || (m.position || m.role || '').includes(search) || m.phone?.includes(search))
  const handleAdd = async (m: any) => {
    setAdding(m.id); setError('')
    // 加入日期自动取成员的 entryDate（入职日期）
    const r = await onAdd(m.id, m.entryDate || undefined)
    if (!r.success) setError(r.error || '添加失败'); setAdding(null)
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[color:var(--card)] rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[color:var(--border)]"><h3 className="font-semibold text-[color:var(--fg)]">添加项目成员</h3><button onClick={onClose} className="p-1 hover:bg-[color:var(--panel-2)] rounded-lg transition-colors"><Icon name="X" size={18} /></button></div>
        <div className="p-4 border-b border-[color:var(--border)]">
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索姓名、职位、电话.." className="w-full px-3 py-2 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-xl text-sm focus:ring-2 focus:ring-[color:var(--accent)] focus:border-[color:var(--accent)] transition-[box-shadow,border-color]" />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {error && <p className="text-danger-500 text-sm px-2 mb-2">{error}</p>}
          {filtered.length === 0 ? <div className="text-center py-8 text-[color:var(--muted)] text-sm">{members.length === 0 ? '没有可添加的成员' : '无匹配结果'}</div>
          : filtered.map(m => (
            <div key={m.id} className="flex items-center justify-between p-3 hover:bg-[color:var(--panel-2)] rounded-xl transition-colors">
              <div><p className="text-sm font-medium text-[color:var(--fg)]">{m.name}</p><p className="text-xs text-[color:var(--muted)]">{m.position || m.role || '-'}{m.entryDate ? ` · ${m.entryDate} 入职` : ''}</p></div>
              <button onClick={() => handleAdd(m)} disabled={adding === m.id} className="px-3 py-1 text-xs bg-[color:var(--accent)] text-[color:var(--on-accent)] rounded-lg hover:opacity-90 disabled:opacity-50 transition-colors">{adding === m.id ? '...' : '加入'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
