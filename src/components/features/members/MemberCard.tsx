/**
 * MemberCard 组件
 *
 * 成员卡片组件 - 用于在列表中展示单个成员
 * 使用 React.memo 避免列表中不必要的重渲染
 */

import React from 'react'
import { Icon } from '../../ui/Icon'
import type { Member } from '@/types'
import { calculateAge as calcAge, getWorkerTypeLabel } from '@/utils'

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
 *   member={member}
 *   type="worker"
 *   onClick={() => handleClick(member)}
 *   onEdit={() => handleEdit(member)}
 *   onDelete={() => handleDelete(member.id)}
 *   onTransfer={() => handleTransfer(member)}
 *   onLeave={() => handleLeave(member)}
 *   onReEntry={() => handleReEntry(member)}
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
  const age = calcAge(member.birthDate)
  const isLeft = member.status === 'left'

  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm p-5 hover:shadow-md transition-all cursor-pointer ${
        isLeft ? 'opacity-70' : ''
      }`}
      onClick={() => onClick(member)}
    >
      {/* 头部 */}
      <div className="flex items-start gap-4 mb-4">
        {/* 头像 */}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
          isWorker
            ? 'bg-gradient-to-br from-amber-100 to-amber-200'
            : 'bg-gradient-to-br from-primary-100 to-primary-200'
        }`}>
          <Icon name={iconName} size={24} />
        </div>
        
        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
              {member.name}
            </h3>
            {member.isTeamLeader && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                组长
              </span>
            )}
          </div>
          
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isWorker 
              ? getWorkerTypeLabel(member.workerType || 'other')
              : member.role || '未知职位'
            }
          </p>
        </div>

        {/* 状态标签 */}
        {status && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>

      {/* 详情 */}
      <div className="space-y-2 mb-4">
        {member.phone && (
          <div className="flex items-center text-sm text-slate-600">
            <span className="w-12 text-slate-400"><Icon name="Phone" size={16} /></span>
            <span>{member.phone}</span>
          </div>
        )}
        
        {member.idCard && (
          <div className="flex items-center text-sm text-slate-600">
            <span className="w-12 text-slate-400"><Icon name="CreditCard" size={16} /></span>
            <span className="font-mono">{member.idCard}</span>
            {age && <span className="text-slate-400 ml-1">{age}</span>}
          </div>
        )}

        {isWorker && (member.gender || member.ethnicity) && (
          <div className="flex items-center text-sm text-slate-600">
            <span className="w-12 text-slate-400"><Icon name="UserCircle" size={16} /></span>
            <span>{member.gender}{member.ethnicity && ` / ${member.ethnicity}`}</span>
          </div>
        )}
        
        {member.teamName && (
          <div className="flex items-center text-sm text-slate-600">
            <span className="w-12 text-slate-400"><Icon name="Users" size={16} /></span>
            <span className="truncate">{member.projectName} / {member.teamName}</span>
          </div>
        )}

        {isWorker && member.dailyWage && (
          <div className="flex items-center text-sm text-green-600">
            <span className="w-12 text-slate-400"><Icon name="DollarSign" size={16} /></span>
            <span>{member.dailyWage} 元/天</span>
          </div>
        )}

        {(member.entryDate || isLeft) && (
          <div className="flex items-center text-sm text-slate-500">
            <span className="w-12 text-slate-400"><Icon name="Calendar" size={16} /></span>
            <span>{isLeft ? `离职: ${member.actualLeaveDate || '-'}` : `入职: ${member.entryDate}`}</span>
          </div>
        )}
      </div>

      {/* 标签 */}
      <div className="flex flex-wrap gap-1 mb-4">
        {member.idCardFront && (
          <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded"><Icon name="CreditCard" size={12} className="inline-block" /> 身份证</span>
        )}
        {member.contractFile && (
          <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded"><Icon name="FileText" size={12} className="inline-block" /> 合同</span>
        )}
        {isWorker && member.threeLevelEducation && (
          <span className="px-2 py-0.5 bg-green-50 text-green-600 text-xs rounded"><Icon name="Check" size={12} className="inline-block" /> 三级教育</span>
        )}
      </div>

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
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                删除
              </button>
            </>
          )
        )}
      </div>
    </div>
  )
})
