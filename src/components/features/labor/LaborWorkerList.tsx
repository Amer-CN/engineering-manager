// LaborWorkerList.tsx - 工人库Tab

import React, { useState } from 'react'
import { Icon } from '../../ui/Icon'
import type { Member, WorkerTeam } from '../../../types/electron'
import { getWorkerTypeLabel } from '../../../utils'

interface LaborWorkerListProps {
  members: Member[]
  projects: any[]
  workerTeams: WorkerTeam[]
  onRefresh: () => void
  onAddWorker: () => void
  onEditWorker: (worker: any) => void
  onDeleteWorker: (workerId: number) => void
  onImportClick: () => void
}

function calcAge(birthDate: string): number {
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

const LaborWorkerList: React.FC<LaborWorkerListProps> = ({
  members,
  projects,
  workerTeams,
  onRefresh,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  onImportClick,
}) => {
  const [filterProject, setFilterProject] = useState<number | null>(null)
  const [filterTeam, setFilterTeam] = useState<number | null>(null)

  // 筛选后的工人
  const filteredWorkers = members.filter(w => {
    if (filterProject && w.projectId !== filterProject) return false
    if (filterTeam && w.teamId !== filterTeam) return false
    return true
  })

  return (
    <div>
      {/* 筛选器 */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <span className="text-slate-600 font-medium">筛选：</span>
        <select
          value={filterProject || ''}
          onChange={e => {
            setFilterProject(e.target.value ? Number(e.target.value) : null)
            setFilterTeam(null)
          }}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
        >
          <option value="">全部项目</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterTeam || ''}
          onChange={e => setFilterTeam(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          disabled={!filterProject}
        >
          <option value="">全部班组</option>
          {workerTeams.filter(t => !filterProject || t.projectId === filterProject).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button
          onClick={onAddWorker}
          className="ml-auto bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          <Icon name="Plus" size={18} className="mr-1" />添加工人
        </button>
        <button
          onClick={onImportClick}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors flex items-center"
        >
          <Icon name="Upload" size={18} className="mr-1" />导入Excel
        </button>
      </div>

      {/* 工人表格 */}
      {filteredWorkers.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">姓名</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">身份证号</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">年龄</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">性别</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">工种</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">日工资</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">银行卡号</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkers.map(worker => {
                  const age = worker.birthDate ? calcAge(worker.birthDate) : null
                  const isOverage = age !== null && age > 60
                  return (
                    <tr key={worker.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3 py-2.5 font-medium text-slate-800">{worker.name}</td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{worker.idCard || '-'}</td>
                      <td className={`px-3 py-2.5 text-center text-sm font-medium ${isOverage ? 'text-red-600' : 'text-slate-600'}`}>
                        {age !== null ? age : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">{worker.gender || '-'}</td>
                      <td className="px-3 py-2.5 text-slate-600">{worker.workerType ? getWorkerTypeLabel(worker.workerType as any) : '-'}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 font-medium">{worker.dailyWage ? `¥${worker.dailyWage}` : '-'}</td>
                      <td className="px-3 py-2.5 text-slate-500 font-mono text-xs">{(worker as any).bankAccount || '-'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditWorker(worker)}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => onDeleteWorker((worker as any).workerId)}
                            className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="text-6xl mb-4"><Icon name="Construction" size={48} /></div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">暂无工人</h3>
          <p className="text-slate-500 mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
          <button
            onClick={onAddWorker}
            className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            添加工人
          </button>
        </div>
      )}
    </div>
  )
}

export default LaborWorkerList
