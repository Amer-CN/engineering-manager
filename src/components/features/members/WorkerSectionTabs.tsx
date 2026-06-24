import type { Member, WorkerTeam } from '@/types'
import { TeamCard } from './WorkerSectionModals'
import FilterBar from '../../ui/FilterBar'
import { DataTable } from '@/components/DataTable'
import { Card } from '@/components/ui/Card'
import { Button } from '../../ui/Button'

interface TeamsTabProps {
  workerTeams: WorkerTeam[]
  teamsByProject: Record<number, { projectName: string; projectId: number; teams: WorkerTeam[] }>
  getTeamWorkerCount: (teamId: number) => number
  onDeleteTeam: (id: number) => void
  onManageWorkers?: (teamId: number, teamName: string, projectId: number) => void
  onOpenAddModal: () => void
  onOpenEditModal: (team: WorkerTeam) => void
}

export function TeamsTab({
  workerTeams,
  teamsByProject,
  getTeamWorkerCount,
  onDeleteTeam,
  onManageWorkers,
  onOpenAddModal,
  onOpenEditModal,
}: TeamsTabProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="text-slate-500">
          按项目分类管理班组，共{workerTeams.length} 个班组 </div>
        <div className="flex items-center gap-3">
          <Button onClick={onOpenAddModal}  variant="warning">
            <span className="mr-2">+</span>添加班组
          </Button>
        </div>
      </div>

      {Object.keys(teamsByProject).length > 0 ? (
        <div className="space-y-6">
          {Object.values(teamsByProject).map(projectGroup => (
            <Card bordered={false} className="overflow-hidden">
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="mr-2">📁</span>
                  <span className="font-medium text-slate-800">{projectGroup.projectName}</span>
                </div>
                <span className="text-sm text-slate-500">{projectGroup.teams.length} 个班组</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projectGroup.teams.map(team => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      workerCount={getTeamWorkerCount(team.id)}
                      onEdit={() => onOpenEditModal(team)}
                      onDelete={() => onDeleteTeam(team.id)}
                      onManageWorkers={onManageWorkers}
                    />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card bordered={false} className="p-12 text-center">
          <div className="text-6xl mb-4">🏗️</div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">暂无班组</h3>
          <p className="text-slate-500 mb-6">请先添加项目，然后创建班组</p>
          <Button onClick={onOpenAddModal}  variant="warning">
            添加班组
          </Button>
        </Card>
      )}
    </>
  )
}

interface WorkersTabProps {
  filterProject: number | null
  filterTeam: number | null
  onFilterProjectChange: (v: number | null) => void
  onFilterTeamChange: (v: number | null) => void
  projects: Array<{ id: number; name: string }>
  workerTeams: WorkerTeam[]
  filteredWorkers: Member[]
  columns: any[]
  onAddWorker: () => void
  onImportClick: () => void
}

export function WorkersTab({
  filterProject,
  filterTeam,
  onFilterProjectChange,
  onFilterTeamChange,
  projects,
  workerTeams,
  filteredWorkers,
  columns,
  onAddWorker,
  onImportClick,
}: WorkersTabProps) {
  return (
    <>
      <FilterBar className="mb-6">
        <span className="text-slate-600 font-medium">筛选：</span>
        <select
          value={filterProject || ''}
          onChange={e => { onFilterProjectChange(e.target.value ? Number(e.target.value) : null); onFilterTeamChange(null) }}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="">全部项目</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterTeam || ''}
          onChange={e => onFilterTeamChange(e.target.value ? Number(e.target.value) : null)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          disabled={!filterProject}
        >
          <option value="">全部班组</option>
          {workerTeams.filter(t => !filterProject || t.projectId === filterProject).map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button onClick={onAddWorker}  variant="warning" className="flex items-center">
          <span className="mr-1">+</span>添加工人
        </Button>
        <Button onClick={onImportClick}  variant="primary" className="px-5 py-2 flex items-center">
          <span className="mr-1">↑</span>导入Excel
        </Button>
      </FilterBar>

      {filteredWorkers.length > 0 ? (
        <DataTable
          data={filteredWorkers}
          columns={columns}
          rowKey="id"
          pagination={false}
          showContainer={true}
          stickyHeader={true}
          emptyText="暂无工人"
          emptyIcon="Construction"
        />
      ) : (
        <Card bordered={false} className="p-12 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-lg font-medium text-slate-800 mb-2">暂无工人</h3>
          <p className="text-slate-500 mb-6">请先在班组管理中从工人库添加，或导入 Excel</p>
          <Button onClick={onAddWorker}  variant="warning">
            添加工人
          </Button>
        </Card>
      )}
    </>
  )
}
