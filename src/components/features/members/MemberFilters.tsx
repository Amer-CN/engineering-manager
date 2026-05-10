/**
 * MemberFilters 组件
 * 
 * 成员筛选组件
 */

import React from 'react'
import type { Member, WorkerStatus } from '@/types'
import { Icon } from '../../ui/Icon'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemberFiltersProps {
  searchTerm: string
  filterProject: number | null
  filterTeam: number | null
  filterStatus: WorkerStatus | 'all'
  projects: { id: number; name: string }[]
  teams: { id: number; name: string }[]
  memberType: 'staff' | 'worker'
  onSearchChange: (value: string) => void
  onProjectChange: (value: number | null) => void
  onTeamChange: (value: number | null) => void
  onStatusChange: (value: WorkerStatus | 'all') => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MemberFilters 组件
 * 
 * @example
 * ```tsx
 * <MemberFilters
 *   searchTerm={searchTerm}
 *   filterProject={filterProject}
 *   filterTeam={filterTeam}
 *   filterStatus={filterStatus}
 *   projects={projects}
 *   teams={teams}
 *   memberType="staff"
 *   onSearchChange={setSearchTerm}
 *   onProjectChange={setFilterProject}
 *   onTeamChange={setFilterTeam}
 *   onStatusChange={setFilterStatus}
 * />
 * ```
 */
export function MemberFilters({
  searchTerm,
  filterProject,
  filterTeam,
  filterStatus,
  projects,
  teams,
  memberType,
  onSearchChange,
  onProjectChange,
  onTeamChange,
  onStatusChange,
}: MemberFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-6 flex-wrap">
      {/* 搜索框 */}
      <div className="flex-1 min-w-[200px] relative">
        <input
          type="text"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="搜索姓名、电话..."
          className="input pl-10 w-full"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <Icon name="Search" size={16} />
        </span>
      </div>

      {/* 项目筛选 */}
      <select
        value={filterProject || ''}
        onChange={e => onProjectChange(e.target.value ? Number(e.target.value) : null)}
        className="select w-44"
      >
        <option value="">全部项目</option>
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      {/* 班组筛选 (仅农民工显示) */}
      {memberType === 'worker' && (
        <select
          value={filterTeam || ''}
          onChange={e => onTeamChange(e.target.value ? Number(e.target.value) : null)}
          className="select w-40"
        >
          <option value="">全部班组</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      )}

      {/* 状态筛选 (仅农民工显示) */}
      {memberType === 'worker' && (
        <select
          value={filterStatus}
          onChange={e => onStatusChange(e.target.value as WorkerStatus | 'all')}
          className="select w-32"
        >
          <option value="all">全部状态</option>
          <option value="active">在职</option>
          <option value="left">已离场</option>
        </select>
      )}
    </div>
  )
}
