/**
 * MemberList 组件
 *
 * 成员列表组件 - 展示所有成员的列表
 * @deprecated 此组件已废弃，工人管理模块已改用 LaborWorkerList
 */

import type { Member } from '@/types'
import { MemberCard } from './MemberCard'
import { EmptyState } from '@/components/ui/EmptyState'
import Spinner from '@/components/ui/Spinner'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemberListProps {
  members: Member[]
  loading: boolean
  type: 'staff' | 'worker'
  onMemberClick: (member: Member) => void
  onEdit: (member: Member) => void
  onDelete: (id: number) => void
  onAdd: () => void
  onLeave?: (member: Member) => void
  onReEntry?: (member: Member) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MemberList 组件
 * 
 * @example
 * ```tsx
 * <MemberList
 *   members={filteredMembers}
 *   loading={loading}
 *   type="staff"
 *   onMemberClick={handleClick}
 *   onEdit={handleEdit}
 *   onDelete={handleDelete}
 *   onAdd={handleAdd}
 * />
 * ```
 */
export function MemberList({
  members,
  loading,
  type,
  onMemberClick,
  onEdit,
  onDelete,
  onAdd,
  onLeave,
  onReEntry,
}: MemberListProps) {
  // 加载状态
  if (loading) {
    return <Spinner size="lg" text="加载人员数据..." />
  }

  // 空状态
  if (members.length === 0) {
    return (
      <div className="card p-12 text-center">
        <EmptyState title={`暂无${type === 'staff' ? '管理人员' : '农民工'}`} />
        <button
          onClick={onAdd}
          className="btn btn-primary mt-6"
        >
          + 添加{type === 'staff' ? '管理人员' : '农民工'}
        </button>
      </div>
    )
  }

  // 成员列表
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {members.map(member => (
        <MemberCard
          key={member.id}
          member={member}
          type={type}
          onClick={onMemberClick}
          onEdit={onEdit}
          onDelete={onDelete}
          onLeave={onLeave}
          onReEntry={onReEntry}
        />
      ))}
    </div>
  )
}
