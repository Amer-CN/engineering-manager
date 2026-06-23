import { useState } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { useMaskedFn } from "@/hooks/useMaskedValue";
import { Icon } from '../../ui/Icon'
import { StatusBadge, WORKER_STATUS } from '@/constants/status'
import { Modal } from '../../ui/Modal/Modal'
import { useConfirm } from '@/hooks/useConfirm'
import { getWorkerTypeLabel } from '@/utils'
import { WorkerWageHistoryModal } from '../labor/WorkerWageHistoryModal'
import { Button } from '../../ui/Button'

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
  const masked = useMaskedFn()
  const { confirm, ConfirmDialog } = useConfirm()
  const [wageHistoryWorker, setWageHistoryWorker] = useState<{ id: number; name: string; dailyWage: number } | null>(null)

  const teamWorkers = members.filter((w: any) => w.teamId != null && w.teamId === teamId)
  const otherTeams = workerTeams.filter(t => t.id !== teamId && t.projectId === projectId)

  const columns: Column<any>[] = [
    { key: 'name', title: '姓名', render: (item) => <span className="font-medium text-slate-800">{item.name}</span> },
    { key: 'idCard', title: '身份证号', render: (item: any) => <span className="text-slate-500 font-mono text-xs">{masked('idCard', item.idCard) || '-'}</span> },
    { key: 'workerType', title: '工种', render: (item) => <span className="text-slate-600">{item.workerType ? getWorkerTypeLabel(item.workerType as any) : '-'}</span> },
    { key: 'dailyWage', title: '日工资', align: 'right', render: (item) => <span className="text-slate-700">{item.dailyWage ? `¥${item.dailyWage}` : '-'}</span> },
    { key: 'entryDate', title: '进场日期', render: (item) => <span className="text-slate-500 text-xs">{item.entryDate || '-'}</span> },
    { key: 'status', title: '状态', align: 'center', render: (item) => <StatusBadge status={item.status} config={WORKER_STATUS} /> },
    { key: 'actions', title: '操作', align: 'right', render: (item) => (
      <div className="flex items-center justify-end gap-1">
        <Button onClick={() => setWageHistoryWorker({ id: item.id, name: item.name, dailyWage: item.dailyWage || 0 })}
           variant="ghost" size="sm" className="btn text-amber-600">薪资</Button>
        {otherTeams.length > 0 && (
          <div className="relative group">
            <Button  variant="ghost" size="sm" className="btn text-amber-600">调组</Button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg py-1 hidden group-hover:block z-10 min-w-[120px]">
              {otherTeams.map(t => (
                <Button key={t.id} onClick={() => onTransferWorker(item.id, t.id)}
                   variant="secondary" size="sm" className="btn w-full text-left">
                  {t.name}
                </Button>
              ))}
            </div>
          </div>
        )}
        <Button onClick={async () => {
          const ok = await confirm({ title: '移除工人', content: `确认将 ${item.name} 从班组中移除？`, confirmVariant: 'danger' })
          if (ok) onRemoveWorker(item.id)
        }}  variant="danger" size="sm" className="btn">移除</Button>
      </div>
    )},
  ]

  return (
  <>
  <Modal isOpen={show} onClose={onClose}
  title={<span>{teamName} — 班组工人管理</span>}
  size="full"
  footer={
  <div className="flex items-center justify-between w-full">
  <span className="text-sm text-slate-500">{teamWorkers.length} 名工人</span>
  <div className="flex items-center gap-3">
  <Button onClick={() => onAddWorkers(teamId, projectId)}
   variant="primary" className="btn">
  <Icon name="Plus" size={16} />从工人库添加
  </Button>
  </div>
  </div>
  }>
  <p className="text-sm text-slate-500 mb-4">共 {teamWorkers.length} 名工人</p>

  {/* Content */}
  <div>
  {teamWorkers.length > 0 ? (
    <DataTable
      data={teamWorkers}
      columns={columns}
      rowKey="id"
      pagination={false}
      showContainer={true}
      stickyHeader={true}
      emptyText="暂无工人"
      emptyIcon="Users"
    />
  ) : (
  <div className="text-center py-12">
  <div className="text-6xl mb-4"><Icon name="Users" size={48} /></div>
  <h3 className="text-lg font-medium text-slate-800 mb-2">该班组暂无工人</h3>
  <p className="text-slate-500 mb-4">从工人库添加工人到此班组</p>
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
