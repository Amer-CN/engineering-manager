import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { getWorkerTypeLabel } from '@/utils'
import { WorkerWageHistoryModal } from '../labor/WorkerWageHistoryModal'

interface TeamWorkerModalProps {
  show: boolean
  teamId: number
  teamName: string
  projectId: number
  members: any[]
  workerTeams: Array<{ id: number; name: string; projectId: number }>
  onClose: () => void
  onUpdateWorker: (pwId: number, data: Record<string, any>) => void
  onRemoveWorker: (pwId: number) => void
  onTransferWorker: (pwId: number, toTeamId: number) => void
  onAddWorkers: (teamId: number, projectId: number) => void
  onWageUpdated?: () => void
}

export function TeamWorkerModal({
  show, teamId, teamName, projectId, members, workerTeams,
  onClose, onUpdateWorker, onRemoveWorker, onTransferWorker, onAddWorkers, onWageUpdated
}: TeamWorkerModalProps) {
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)
  const [wageHistoryWorker, setWageHistoryWorker] = useState<{ id: number; name: string; dailyWage: number } | null>(null)

  const teamWorkers = members.filter((w: any) => w.teamId === teamId)
  const otherTeams = workerTeams.filter(t => t.id !== teamId && t.projectId === projectId)

  if (!show) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{teamName} — 班组工人管理</h2>
              <p className="text-sm text-slate-500 mt-0.5">共 {teamWorkers.length} 名工人</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
              <Icon name="X" size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {teamWorkers.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">姓名</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">身份证号</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">工种</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">日工资</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">进场日期</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">状态</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {teamWorkers.map((worker: any) => (
                      <tr key={worker.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200">{worker.name}</td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-xs">{worker.idCard || '-'}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                          {worker.workerType ? getWorkerTypeLabel(worker.workerType as any) : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700 dark:text-slate-300">
                          {worker.dailyWage ? `¥${worker.dailyWage}` : '-'}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{worker.entryDate || '-'}</td>
                        <td className="px-4 py-2.5 text-center">
                          {worker.status === 'active' ? (
                            <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700">在职</span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-500">离场</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => setWageHistoryWorker({ id: worker.id, name: worker.name, dailyWage: worker.dailyWage || 0 })}
                              className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded">薪资</button>
                            {otherTeams.length > 0 && (
                              <div className="relative group">
                                <button className="px-2 py-1 text-xs text-amber-600 hover:bg-amber-50 rounded">调组</button>
                                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-[120px]">
                                  {otherTeams.map(t => (
                                    <button key={t.id} onClick={() => onTransferWorker(worker.id, t.id)}
                                      className="block w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                                      {t.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {confirmRemove === worker.id ? (
                              <span className="flex items-center gap-1">
                                <span className="text-xs text-red-500">确认?</span>
                                <button onClick={() => { onRemoveWorker(worker.id); setConfirmRemove(null) }} className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded">是</button>
                                <button onClick={() => setConfirmRemove(null)} className="px-1.5 py-0.5 text-xs bg-slate-200 rounded">否</button>
                              </span>
                            ) : (
                              <button onClick={() => setConfirmRemove(worker.id)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">移除</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4"><Icon name="Users" size={48} /></div>
                <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">该班组暂无工人</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-4">从工人库添加工人到此班组</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500">{teamWorkers.length} 名工人</span>
            <div className="flex items-center gap-3">
              <button onClick={() => onAddWorkers(teamId, projectId)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5">
                <Icon name="Plus" size={16} />从工人库添加
              </button>
              <button onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                关闭
              </button>
            </div>
          </div>
        </motion.div>
      </div>
      {/* Wage history modal */}
      {wageHistoryWorker && (
        <WorkerWageHistoryModal
          show={!!wageHistoryWorker}
          projectWorkerId={wageHistoryWorker.id}
          workerName={wageHistoryWorker.name}
          currentDailyWage={wageHistoryWorker.dailyWage}
          onClose={() => setWageHistoryWorker(null)}
          onSaved={onWageUpdated}
        />
      )}
    </AnimatePresence>
  )
}

export default TeamWorkerModal
