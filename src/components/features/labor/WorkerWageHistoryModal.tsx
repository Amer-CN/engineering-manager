// WorkerWageHistoryModal.tsx — 工人日工资标准调整历史弹窗

import { useState, useEffect } from 'react'
import { useToastStore } from '@/store/toastStore'

interface WageHistoryItem {
  id: number
  yearMonth: string
  dailyWage: number
  note?: string
  createdAt: string
}

interface Props {
  show: boolean
  projectWorkerId: number
  workerName: string
  currentDailyWage: number
  onClose: () => void
  onSaved?: () => void
}

export function WorkerWageHistoryModal({ show, projectWorkerId, workerName, currentDailyWage, onClose, onSaved }: Props) {
  const showToast = useToastStore(state => state.showToast)
  const [history, setHistory] = useState<WageHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formYearMonth, setFormYearMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [formDailyWage, setFormDailyWage] = useState(String(currentDailyWage))
  const [formNote, setFormNote] = useState('')
  const [latestWage, setLatestWage] = useState(currentDailyWage)

  useEffect(() => {
    if (!show) return
    setLoading(true)
    Promise.all([
      window.electronAPI.getWageHistory(projectWorkerId),
      window.electronAPI.getEffectiveWage(projectWorkerId, new Date().toISOString().slice(0, 7)),
    ]).then(([hist, eff]) => {
      if (hist.success && hist.data) setHistory(hist.data)
      if (eff.success && eff.data?.dailyWage) setLatestWage(eff.data.dailyWage)
    }).catch(() => setHistory([]))
      .finally(() => setLoading(false))
  }, [show, projectWorkerId])

  const handleSave = async () => {
    if (!formYearMonth) { showToast('请选择月份', 'error'); return }
    const wage = Number(formDailyWage)
    if (!wage || wage <= 0) { showToast('请输入有效日工资', 'error'); return }
    const res = await window.electronAPI.saveWageHistory({
      projectWorkerId,
      yearMonth: formYearMonth,
      dailyWage: wage,
      note: formNote || undefined,
    })
    if (res.success) {
      showToast(editingId ? '日工资标准已更新' : '日工资标准已保存', 'success')
      // Reload history
      const r = await window.electronAPI.getWageHistory(projectWorkerId)
      if (r.success && r.data) setHistory(r.data)
      setShowForm(false)
      setEditingId(null)
      setFormNote('')
      if (onSaved) onSaved()
    } else {
      showToast(res.error || '保存失败', 'error')
    }
  }

  const handleEdit = (h: WageHistoryItem) => {
    setEditingId(h.id)
    setFormYearMonth(h.yearMonth)
    setFormDailyWage(String(h.dailyWage))
    setFormNote(h.note || '')
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除该记录吗？')) return
    const res = await window.electronAPI.deleteWageHistory(id)
    if (res.success) {
      showToast('已删除', 'success')
      setHistory(prev => prev.filter(h => h.id !== id))
    } else showToast(res.error || '删除失败', 'error')
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingId(null)
    setFormNote('')
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{workerName}</h3>
            <p className="text-xs text-slate-400 mt-0.5">当前日工资: ¥{latestWage} · 日工资标准记录</p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l8 8M13 5l-8 8" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Add button */}
          {!showForm && (
            <button onClick={() => {
              setEditingId(null)
              setFormYearMonth(new Date().toISOString().slice(0, 7))
              setFormDailyWage(String(currentDailyWage))
              setFormNote('')
              setShowForm(true)
            }}
              className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-amber-400 hover:text-amber-600 transition-colors">
              + 新增日工资标准
            </button>
          )}

          {/* Form */}
          {showForm && (
            <div className="p-4 bg-slate-50 rounded-lg space-y-3">
              <p className="text-xs font-medium text-slate-500">{editingId ? '编辑日工资标准' : '新增日工资标准'}</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">起效月份 *</label>
                  <input type="month" value={formYearMonth} onChange={e => setFormYearMonth(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">日工资标准 *</label>
                  <input type="number" value={formDailyWage} onChange={e => setFormDailyWage(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" placeholder="元/天" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">备注</label>
                <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" placeholder="如：本月施工难度大，上调单价" />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={cancelForm} className="btn btn-secondary btn-sm">取消</button>
                <button onClick={handleSave} className="btn btn-warning btn-sm">
                  {editingId ? '更新' : '保存'}
                </button>
              </div>
            </div>
          )}

          {/* History list */}
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-500 border-t-transparent" /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">暂无日工资标准记录</div>
          ) : (
            <div className="space-y-2">
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{h.yearMonth}</span>
                      <span className="text-sm font-bold text-amber-700">¥{h.dailyWage}</span>
                      {String(h.dailyWage) !== String(currentDailyWage) && (
                        <span className="text-xs text-slate-400">（当前: ¥{currentDailyWage}）</span>
                      )}
                    </div>
                    {h.note && <div className="text-xs text-slate-400 mt-0.5">{h.note}</div>}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleEdit(h)}
                      className="text-xs text-blue-500 hover:text-blue-700 px-1">编辑</button>
                    <button onClick={() => handleDelete(h.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-1">删除</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
