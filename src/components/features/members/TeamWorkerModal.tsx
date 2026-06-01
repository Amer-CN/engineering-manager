import { useState } from 'react'
import { Icon } from '../../ui/Icon'
import { StatusBadge, WORKER_STATUS } from '@/constants/status'
import { Modal } from '../../ui/Modal/Modal'
import { useConfirm } from '@/hooks/useConfirm'
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
  const { confirm, ConfirmDialog } = useConfirm()
  const [wageHistoryWorker, setWageHistoryWorker] = useState<{ id: number; name: string; dailyWage: number } | null>(null)

  const teamWorkers = members.filter((w: any) => w.teamId != null && w.teamId === teamId)
  const otherTeams = workerTeams.filter(t => t.id !== teamId && t.projectId === projectId)

  return (
    <>
      <Modal isOpen={show} onClose={onClose}
        title={<span>{teamName} — 班组工人管理</span>}
        size="full"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-slate-500">{teamWorkers.length} 名工人</span>
            <div className="flex items-center gap-3">
              <button onClick={() => onAddWorkers(teamId, projectId)}
                className="btn btn-primary">
                <Icon name="Plus" size={16} />从工人库添加
              </button>
            </div>
          </div>
        }>
        <p className="text-sm text-slate-500 mb-4">共 {teamWorkers.length} 名工人</p>

        {/* Content */}
        <div>
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
                        <StatusBadge status={worker.status} config={WORKER_STATUS} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setWageHistoryWorker({ id: worker.id, name: worker.name, dailyWage: worker.dailyWage || 0 })}
                            className="btn btn-ghost btn-sm text-amber-600">薪资</button>
                          {otherTeams.length > 0 && (
                            <div className="relative group">
                              <button className="btn btn-ghost btn-sm text-amber-600">调组</button>
                              <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-[120px]">
                                {otherTeams.map(t => (
                                  <button key={t.id} onClick={() => onTransferWorker(worker.id, t.id)}
                                    className="btn btn-secondary btn-sm w-full text-left">
                                    {t.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <button onClick={async () => {
                            const ok = await confirm({ title: '移除工人', content: `确认将 ${worker.name} 从班组中移除？`, confirmVariant: 'danger' })
                            if (ok) onRemoveWorker(worker.id)
                          }} className="btn btn-danger btn-sm">移除</button>
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
      </Modal>
      {ConfirmDialog}
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
    </>
  )
}

export default TeamWorkerModal
