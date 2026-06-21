import React from 'react'
import { Icon } from '../../ui/Icon'
import type { Member } from '@/types'
import { getWorkerTypeLabel } from '@/utils'

export interface MemberCardMediaProps {
  member: Member
  isWorker: boolean
  iconName: string
  status: { label: string; color: string } | null
}

export const MemberCardMedia = React.memo(function MemberCardMedia({
  member,
  isWorker,
  iconName,
  status,
}: MemberCardMediaProps) {
  return (
    <div className="flex items-start gap-4 mb-4">
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
        isWorker
          ? 'bg-gradient-to-br from-amber-100 to-amber-200'
          : 'bg-gradient-to-br from-primary-100 to-primary-200'
      }`}>
        <Icon name={iconName} size={24} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-800 truncate">
            {member.name}
          </h3>
          {member.isTeamLeader && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
              组长
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 mt-0.5">
          {isWorker
            ? getWorkerTypeLabel(member.workerType || 'other')
            : member.role || '未知职位'
          }
        </p>
      </div>

      {status && (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      )}
    </div>
  )
})
