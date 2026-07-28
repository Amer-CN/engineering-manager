import React from 'react'
import { useMaskedFn } from '@/hooks/useMaskedValue'
import { Icon } from '../../ui/Icon'
import type { Member } from '@/types'
import { calculateAge } from './MemberCard'

export interface MemberCardInfoProps {
  member: Member
  isWorker: boolean
  isLeft: boolean
}

export const MemberCardInfo = React.memo(function MemberCardInfo({
  member,
  isWorker,
  isLeft,
}: MemberCardInfoProps) {
  const masked = useMaskedFn()
  const age = calculateAge(member.birthDate)

  return (
    <>
      <div className="space-y-2 mb-4">
        {member.phone && (
          <div className="flex items-center text-sm text-[color:var(--fg-2)]">
            <span className="w-12 text-[color:var(--muted)]"><Icon name="Phone" size={16} /></span>
            <span>{masked('phone', member.phone)}</span>
          </div>
        )}

        {member.idCard && (
          <div className="flex items-center text-sm text-[color:var(--fg-2)]">
            <span className="w-12 text-[color:var(--muted)]"><Icon name="CreditCard" size={16} /></span>
            <span className="font-mono">{masked('idCard', member.idCard)}</span>
            {age && <span className="text-[color:var(--muted)] ml-1">{age}</span>}
          </div>
        )}

        {isWorker && (member.gender || member.ethnicity) && (
          <div className="flex items-center text-sm text-[color:var(--fg-2)]">
            <span className="w-12 text-[color:var(--muted)]"><Icon name="UserCircle" size={16} /></span>
            <span>{member.gender}{member.ethnicity && ` / ${member.ethnicity}`}</span>
          </div>
        )}

        {member.teamName && (
          <div className="flex items-center text-sm text-[color:var(--fg-2)]">
            <span className="w-12 text-[color:var(--muted)]"><Icon name="Users" size={16} /></span>
            <span className="truncate">{member.projectName} / {member.teamName}</span>
          </div>
        )}

        {isWorker && member.dailyWage && (
          <div className="flex items-center text-sm text-success-600">
            <span className="w-12 text-[color:var(--muted)]"><Icon name="DollarSign" size={16} /></span>
            <span>{member.dailyWage} 元/天</span>
          </div>
        )}

        {(member.entryDate || isLeft) && (
          <div className="flex items-center text-sm text-[color:var(--muted)]">
            <span className="w-12 text-[color:var(--muted)]"><Icon name="Calendar" size={16} /></span>
            <span>{isLeft ? `离职: ${member.actualLeaveDate || '-'}` : `入职: ${member.entryDate}`}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {member.idCardFront && (
          <span className="px-2 py-0.5 bg-success-50 text-success-600 text-xs rounded"><Icon name="CreditCard" size={12} className="inline-block" /> 身份证</span>
        )}
        {member.contractFile && (
          <span className="px-2 py-0.5 bg-success-50 text-success-600 text-xs rounded"><Icon name="FileText" size={12} className="inline-block" /> 合同</span>
        )}
        {isWorker && member.threeLevelEducation && (
          <span className="px-2 py-0.5 bg-success-50 text-success-600 text-xs rounded"><Icon name="Check" size={12} className="inline-block" /> 三级教育</span>
        )}
      </div>
    </>
  )
})
