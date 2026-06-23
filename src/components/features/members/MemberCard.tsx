/**
 * MemberCard 组件
 *
 * 成员卡片组件 - 用于在列表中展示单个成员
 * 使用 React.memo 避免列表中不必要的重渲染
 */

import React from 'react'
import type { Member } from '@/types'
import { calculateAge as calcAge } from '@/utils'
import { MemberCardMedia } from './MemberCardMedia'
import { MemberCardInfo } from './MemberCardInfo'
import { Card } from '@/components/ui/Card'

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemberCardProps {
  member: Member
  /** 卡片类型：staff=管理人员, worker=农民工 */
  type?: 'staff' | 'worker'
  onClick: (member: Member) => void
  onEdit: (member: Member) => void
  onDelete: (id: number) => void
  /** 农民工专属：调组回调 */
  onTransfer?: (member: Member) => void
  /** 农民工专属：离场回调 */
  onLeave?: (member: Member) => void
  /** 农民工专属：重新入场回调 */
  onReEntry?: (member: Member) => void
}

// ═══════════════════════════════════════════════════════════════════════════════
// Status Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const statusStyles = {
  active: { label: '在职', color: 'bg-green-100 text-green-700' },
  left: { label: '已离场', color: 'bg-slate-100 text-slate-700' },
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 计算年龄（带单位）
 */
export function calculateAge(birthDate: string | undefined): string {
  if (!birthDate) return ''
  const age = calcAge(birthDate)
  return age > 0 ? `${age}岁` : ''
}

/**
 * 获取角色图标
 */
export function getRoleIcon(role: string, memberType: string): string {
  if (memberType === 'worker') return 'Construction'

  const staffRoles: Record<string, string> = {
  '项目经理': 'UserCircle',
  '技术负责人': 'Wrench',
  '施工员': 'Building2',
  '生产经理': 'Settings',
  '安全负责人': 'Shield',
  '质量员': 'Ruler',
  '造价工程师': 'TrendingUp',
  '材料员': 'Package',
  '资料员': 'FolderKanban',
  '财务负责人': 'DollarSign',
  '劳资员': 'UserCircle',
  '商务经理': 'Briefcase',
  '其他': 'UserCircle',
  }
  return staffRoles[role] || 'UserCircle'
}

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * MemberCard 组件
 *
 * @example
 * ```tsx
 * <MemberCard
 * member={member}
 * type="worker"
 * onClick={() => handleClick(member)}
 * onEdit={() => handleEdit(member)}
 * onDelete={() => handleDelete(member.id)}
 * onTransfer={() => handleTransfer(member)}
 * onLeave={() => handleLeave(member)}
 * onReEntry={() => handleReEntry(member)}
 * />
 * ```
 */
export const MemberCard = React.memo(function MemberCard({
  member,
  type,
  onClick,
  onEdit,
  onDelete,
  onTransfer,
  onLeave,
  onReEntry,
}: MemberCardProps) {
  const isWorker = type === 'worker' || member.memberType === 'worker'
  const iconName = getRoleIcon(member.role || '', member.memberType)
  const status = member.status ? statusStyles[member.status] : null
  const isLeft = member.status === 'left'

  return (
  <Card
    className={`bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all cursor-pointer ${
      isLeft ? 'opacity-70' : ''
    }`}
    hoverable
    onClick={() => onClick(member)}
  >
  <MemberCardMedia member={member} isWorker={isWorker} iconName={iconName} status={status} />
  <MemberCardInfo member={member} isWorker={isWorker} isLeft={isLeft} />

  {/* 操作 */}
  <div
  className="flex items-center gap-2 pt-3 border-t border-slate-100"
  onClick={(e) => e.stopPropagation()}
  >
  {isWorker ? (
  isLeft ? (
  <>
  {onReEntry && (
  <button
  onClick={() => onReEntry(member)}
  className="flex-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
  >
  重新入场
  </button>
  )}
  <button
  onClick={() => onDelete(member.id)}
  className="btn btn-danger btn-sm"
  >
  删除
  </button>
  </>
  ) : (
  <>
  <button
  onClick={() => onEdit(member)}
  className="flex-1 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
  >
  编辑
  </button>
  {onTransfer && (
  <button
  onClick={() => onTransfer(member)}
  className="flex-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
  >
  调组
  </button>
  )}
  {onLeave && (
  <button
  onClick={() => onLeave(member)}
  className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
  >
  离场
  </button>
  )}
  </>
  )
  ) : (
  isLeft ? (
  <>
  {onReEntry && (
  <button
  onClick={() => onReEntry(member)}
  className="flex-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
  >
  重新入职
  </button>
  )}
  <button
  onClick={() => onDelete(member.id)}
  className="btn btn-danger btn-sm"
  >
  删除
  </button>
  </>
  ) : (
  <>
  <button
  onClick={() => onEdit(member)}
  className="flex-1 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
  >
  编辑
  </button>
  {onLeave && (
  <button
  onClick={() => onLeave(member)}
  className="px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
  >
  离职
  </button>
  )}
  <button
  onClick={() => onDelete(member.id)}
  className="btn btn-danger btn-sm"
  >
  删除
  </button>
  </>
  )
  )}
  </div>
</Card>
  )
})
