import React, { Suspense } from 'react'
import type { Member, WorkerTeam } from '../../../types/electron'

const WorkerSection = React.lazy(() => import('./WorkerSection'))

interface MemberWorkerSectionProps {
  members: Member[]
  projects: { id: number; name: string }[]
  workerTeams: WorkerTeam[]
  loading: boolean
  onRefresh: () => void | Promise<void>
  onAddWorker: () => void
  onEditWorker: (worker: Member) => void
  onDeleteWorker: (id: number) => void
  onAddTeam: (name: string, projectId: number, leaderId?: number | null) => Promise<void>
  onEditTeam: (team: WorkerTeam) => void
  onDeleteTeam: (id: number) => void
  onTransfer: (worker: any, toTeamId: number, toProjectId: number, transferDate: string, reason: string) => void | Promise<void>
  onLeave: (worker: any, actualLeaveDate: string, remarks: string) => void | Promise<void>
  onReEntry: (worker: any) => void | Promise<void>
  onImportClick: () => void
  onFileDrop: (file: File) => void | Promise<void>
  onAddFromPool: (projectId: number, existingIds: Set<number>) => void
}

const MemberWorkerSection: React.FC<MemberWorkerSectionProps> = (props) => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-orange-500"></div>
      </div>
    }>
      <WorkerSection {...props as any} />
    </Suspense>
  )
}

export default MemberWorkerSection