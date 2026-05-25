import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { useToastStore } from '@/store/toastStore'
import { logUpdate } from '../../../utils/audit'

interface Props {
  orphans: any[]
  departments: any[]
  onClose: () => void
  onDone: () => void
}

const BatchDeptAssignModal: React.FC<Props> = ({ orphans, departments, onClose, onDone }) => {
  const showToast = useToastStore(state => state.showToast)
  const [batchDeptId, setBatchDeptId] = useState<number | ''>('')
  const [selected, setSelected] = useState<Set<number>>(new Set(orphans.map((m: any) => m.id)))

  const handleAssign = async () => {
    if (!batchDeptId) { showToast('请选择目标部门', 'error'); return }
    if (selected.size === 0) { showToast('请选择要分配的人员', 'error'); return }
    try {
      let count = 0
      for (const id of selected) {
        const m = orphans.find((x: any) => x.id === id)
        if (m) {
          await window.electronAPI.updateMember({ ...m, departmentId: batchDeptId as number })
          count++
        }
      }
      showToast(`已将 ${count} 名人员分配到目标部门`, 'success')
      logUpdate('members', `${count} 名员工批量调部门`, 0, { departmentId: batchDeptId, count })
      onDone()
    } catch (e: any) { showToast(e?.message || '批量分配失败', 'error') }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">批量分配部门</h2>
          <button onClick={onClose} className="btn btn-ghost p-1"><Icon name="X" size={18} /></button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">目标部门</label>
            <select value={batchDeptId} onChange={e => setBatchDeptId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
              <option value="">请选择部门</option>
              {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">待分配人员 ({selected.size}/{orphans.length})</label>
              <button onClick={() => setSelected(selected.size === orphans.length ? new Set() : new Set(orphans.map((m: any) => m.id)))}
                className="text-xs text-indigo-600 hover:text-indigo-800">
                {selected.size === orphans.length ? '取消全选' : '全选'}
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {orphans.map((m: any) => (
                <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(m.id)}
                    onChange={() => {
                      const next = new Set(selected)
                      next.has(m.id) ? next.delete(m.id) : next.add(m.id)
                      setSelected(next)
                    }}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-800">{m.name}</span>
                  <span className="text-xs text-slate-400">{m.position || '无职位'}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">取消</button>
          <button type="button" onClick={handleAssign} className="px-5 py-2 btn btn-primary">批量分配</button>
        </div>
      </motion.div>
    </div>
  )
}

export default BatchDeptAssignModal
