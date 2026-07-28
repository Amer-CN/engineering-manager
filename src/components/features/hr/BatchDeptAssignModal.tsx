import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { useToastStore } from '@/store/toastStore'
import { logUpdate } from '../../../utils/audit'
import { getAPI } from '@/services/api-adapter'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import { Button } from '../../ui/Button'
import type { Member, Department } from '@/types'
interface Props {
  orphans: Member[]
  departments: Department[]
  onClose: () => void
  onDone: () => void
}

const BatchDeptAssignModal: React.FC<Props> = ({ orphans, departments, onClose, onDone }) => {
  const showToast = useToastStore(state => state.showToast)
  const [batchDeptId, setBatchDeptId] = useState<number | ''>('')
  const [selected, setSelected] = useState<Set<number>>(new Set(orphans.map((m: Member) => m.id)))

  const handleAssign = async () => {
    if (!batchDeptId) { showToast('请选择目标部门', 'error'); return }
    if (selected.size === 0) { showToast('请选择要分配的人员', 'error'); return }
    try {
      let count = 0
      for (const id of selected) {
        const m = orphans.find((x: Member) => x.id === id)
        if (m) {
          await (await getAPI()).updateMember({ ...m, departmentId: batchDeptId as number })
          count++
        }
      }
      showToast(`已将 ${count} 名人员分配到目标部门`, 'success')
      logUpdate('members', `${count} 名员工批量调部门`, 0, { departmentId: batchDeptId, count })
      onDone()
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : '批量分配失败', 'error') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-[color:var(--card)] rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-[color:var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-lg font-semibold text-[color:var(--fg)]">批量分配部门</h2>
          <Button onClick={onClose}  variant="ghost" className="p-1"><Icon name="X" size={18} /></Button>
        </div>
        <HoverScrollbar className="flex-1"><div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[color:var(--fg-2)] mb-1">目标部门</label>
            <select value={batchDeptId} onChange={e => setBatchDeptId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2 border border-[color:var(--border)] rounded-lg text-sm focus:ring-2 focus:ring-[color:var(--accent-soft)] focus:border-[color:var(--accent)]">
              <option value="">请选择部门</option>
              {departments.map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-[color:var(--fg-2)]">待分配人员 ({selected.size}/{orphans.length})</label>
              <button onClick={() => setSelected(selected.size === orphans.length ? new Set() : new Set(orphans.map((m: Member) => m.id)))}
                className="text-xs text-[color:var(--accent)] hover:opacity-80">
                {selected.size === orphans.length ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-[color:var(--border)] rounded-lg divide-y divide-[color:var(--border)]">
              {orphans.map((m: Member) => (
                <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[color:var(--panel-2)] cursor-pointer">
                  <input type="checkbox" checked={selected.has(m.id)}
                    onChange={() => {
                      const next = new Set(selected)
                      next.has(m.id) ? next.delete(m.id) : next.add(m.id)
                      setSelected(next)
                    }}
                    className="rounded border-[color:var(--border)] text-[color:var(--accent)] focus:ring-[color:var(--accent-soft)]" />
                  <span className="text-sm text-[color:var(--fg)]">{m.name}</span>
                  <span className="text-xs text-[color:var(--muted)]">{m.position || '无职位'}</span>
                </label>
              ))}
            </div>
          </div>
        </div></HoverScrollbar>
        <div className="px-6 py-4 border-t border-[color:var(--border)] flex justify-end gap-3 shrink-0">
          <Button type="button" onClick={onClose}  variant="secondary">取消</Button>
          <Button type="button" onClick={handleAssign}  variant="primary" className="px-5 py-2 ">批量分配</Button>
        </div>
      </motion.div>
    </div>
  )
}

export default BatchDeptAssignModal
