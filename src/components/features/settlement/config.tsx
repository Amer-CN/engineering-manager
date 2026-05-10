import React from 'react'
import { SettlementStatus, SettlementType } from '../../../types/electron'
import { Icon } from '../../ui/Icon'

// 状态配置
export const statusConfig: Record<SettlementStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: '草稿', color: 'text-slate-600', bgColor: 'bg-slate-100' },
  pending: { label: '未办理', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  completed: { label: '已办理', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  archived: { label: '已归档', color: 'text-slate-500', bgColor: 'bg-slate-100' },
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