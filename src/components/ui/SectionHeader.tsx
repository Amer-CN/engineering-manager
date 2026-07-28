/**
 * SectionHeader — Stitch S14 section header pattern.
 * Icon + heading text + optional right content, with bottom border separator.
 *
 * Usage:
 *   <SectionHeader icon="Wallet" title="金额与付款计划" />
 *   <SectionHeader icon="Link" title="关联项目" right={<Badge>3</Badge>} />
 */
import React from 'react'
import { Icon } from './Icon'

interface SectionHeaderProps {
  icon?: string
  title: string
  right?: React.ReactNode
  className?: string
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon, title, right, className = '' }) => {
  return (
    <div className={`flex items-center justify-between border-b border-[color:var(--border)] pb-3 mb-4 ${className}`}>
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={18} className="text-[color:var(--muted)]" />}
        <h3 className="text-base font-semibold tracking-tight text-[color:var(--fg)]">{title}</h3>
      </div>
      {right && <div>{right}</div>}
    </div>
  )
}
