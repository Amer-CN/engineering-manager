import React from 'react'
import { SettlementStatus, SettlementType } from '../../../types/electron'
import { Icon } from '../../ui/Icon'

// 状态配置（pill/icon 为 S19 Stitch 对齐的 outlined 半透明药丸样式）
export const statusConfig: Record<SettlementStatus, { label: string; color: string; bgColor: string; icon: string; pill: string }> = {
  draft: { label: '草稿', color: 'text-[color:var(--muted)]', bgColor: 'bg-[color:var(--panel-2)]', icon: 'FileText', pill: 'bg-[color:var(--panel-2)] text-[color:var(--muted)] border border-[color:var(--border)]' },
  pending: { label: '未办理', color: 'text-[color:var(--warning)]', bgColor: 'bg-[color:var(--warning-soft)]', icon: 'Clock', pill: 'bg-warning-500/10 text-warning-600 border border-warning-500/20' },
  completed: { label: '已办理', color: 'text-[color:var(--success)]', bgColor: 'bg-[color:var(--success-soft)]', icon: 'CheckCircle', pill: 'bg-success-500/10 text-success-600 border border-success-500/20' },
  archived: { label: '已归档', color: 'text-[color:var(--muted)]', bgColor: 'bg-[color:var(--panel-2)]', icon: 'Lock', pill: 'bg-[color:var(--panel-2)] text-[color:var(--muted)] border border-[color:var(--border)]' },
}

export const typeConfig: Record<SettlementType, { label: string; icon: React.ReactNode }> = {
  income: { label: '收入结算', icon: <Icon name="TrendingUp" size={20} /> },
  expense: { label: '支出结算', icon: <Icon name="TrendingDown" size={20} /> }
}

export const subTypeConfig: Record<string, { label: string }> = {
  material: { label: '材料结算' },
  subcontract: { label: '专业分包结算' },
  labor: { label: '劳务人工结算' },
  machinery: { label: '机械设备结算' },
  service: { label: '服务类结算' },
  other: { label: '其他结算' },
}