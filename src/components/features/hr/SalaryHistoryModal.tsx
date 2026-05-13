import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { useToastContext } from '../../../hooks/useToast'

interface Props {
  member: any
  onClose: () => void
}

const emptyEntry = (defaultSalary: number) => ({
  effectiveDate: new Date().toISOString().split('T')[0],
  baseSalary: String(defaultSalary || ''),
  subsidy: '0',
  subsidyNote: '',
  note: ''
})

const SalaryHistoryModal: React.FC<Props> = ({ member, onClose }) => {
  const { showToast } = useToastContext()
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyEntry(member.baseSalary))

  useEffect(() => {
    (async () => {
      setLoading(true)
      const res = await window.electronAPI.getSalaryHistory(member.id)
      if (res.success) setHistory(res.data || [])
      setLoading(false)
    })()
  }, [member.id])

  const handleSave = async () => {
    if (!form.baseSalary) { showToast('请输入基本工资', 'error'); return }
    if (!form.effectiveDate) { showToast('请选择生效日期', 'error'); return }
    const payload = {
      memberId: member.id,
      effectiveDate: form.effectiveDate,
      baseSalary: Number(form.baseSalary),
      subsidy: Number(form.subsidy) || 0,
      subsidyNote: form.subsidyNote,
      note: form.note
    }
    if (editingId) {
      // Update existing — delete old + create new (no update IPC)
      await window.electronAPI.deleteSalaryHistory(editingId)
      setHistory(prev => prev.filter(h => h.id !== editingId))
    }
    const res = await window.electronAPI.createSalaryHistory(payload)
    if (res.success) {
      showToast(editingId ? '已更新' : '已添加', 'success')
      setHistory(prev => [res.data!, ...prev].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)))
      setShowAdd(false)
      setEditingId(null)
      setForm(emptyEntry(member.baseSalary))
    } else {
      showToast(res.error || '保存失败', 'error')
    }
  }

  const startEdit = (h: any) => {
    setEditingId(h.id)
    setForm({
      effectiveDate: h.effectiveDate,
      baseSalary: String(h.baseSalary || ''),
      subsidy: String(h.subsidy || 0),
      subsidyNote: h.subsidyNote || '',
      note: h.note || ''
    })
    setShowAdd(true)
  }

  const cancelForm = () => {
    setShowAdd(false)
    setEditingId(null)
    setForm(emptyEntry(member.baseSalary))
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该薪资记录吗？')) return
    const res = await window.electronAPI.deleteSalaryHistory(id)
    if (res.success) {
      showToast('已删除', 'success')
      setHistory(prev => prev.filter(h => h.id !== id))
    } else showToast(res.error || '删除失败', 'error')
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.2 }}>
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{member.name} - 薪资历史</h2>
            <p className="text-xs text-slate-400 mt-0.5">薪酬计算按月份自动匹配对应时段的薪资标准</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100"><Icon name="X" size={18} /></button>
        </div>

        <div className="p-6">
          {!showAdd && (
            <button onClick={() => setShowAdd(true)}
              className="w-full mb-4 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
              + 新增薪资记录
            </button>
          )}

          {showAdd && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg space-y-3">
              <div className="text-xs font-medium text-slate-500">{editingId ? '编辑薪资记录' : '新增薪资记录'}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">生效日期 *</label>
                  <input type="date" value={form.effectiveDate} onChange={e => setForm(p => ({ ...p, effectiveDate: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">基本工资 *</label>
                  <input type="text" inputMode="numeric" value={form.baseSalary} onChange={e => setForm(p => ({ ...p, baseSalary: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" placeholder="元/月" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">补助</label>
                  <input type="text" inputMode="numeric" value={form.subsidy} onChange={e => setForm(p => ({ ...p, subsidy: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">补助说明</label>
                  <input type="text" value={form.subsidyNote} onChange={e => setForm(p => ({ ...p, subsidyNote: e.target.value }))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" placeholder="如：工地艰苦补助" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">备注</label>
                <input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" placeholder="如：表现优秀调薪" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelForm} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 rounded">取消</button>
                <button onClick={handleSave} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700">{editingId ? '更新' : '保存'}</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">暂无薪资历史记录</div>
          ) : (
            <div className="space-y-2">
              {history.map((h: any) => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">¥{(h.baseSalary || 0).toLocaleString()}</span>
                      {h.subsidy > 0 && <span className="text-xs text-amber-600 font-medium">+¥{h.subsidy.toLocaleString()}</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      生效: {h.effectiveDate}
                      {h.note && <span className="ml-2">· {h.note}</span>}
                      {h.subsidyNote && <span className="ml-2 text-amber-500">· {h.subsidyNote}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(h)}
                      className="text-indigo-400 hover:text-indigo-600 text-xs px-1">编辑</button>
                    <button onClick={() => handleDelete(h.id)}
                      className="text-red-400 hover:text-red-600 text-xs px-1">删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default SalaryHistoryModal
