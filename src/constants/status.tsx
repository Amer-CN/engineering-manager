import type { BadgeVariant } from '@/components/ui/Badge/Badge'

/**
 * 统一状态标签配置
 * 所有业务实体的状态显示都应使用这些常量，确保全站视觉一致
 */

interface StatusConfig {
  label: string
  variant: BadgeVariant
}

// ── 项目状态 ──
export const PROJECT_STATUS: Record<string, StatusConfig> = {
  planning: { label: '规划中', variant: 'info' },
  in_progress: { label: '进行中', variant: 'success' },
  completed: { label: '已完工', variant: 'primary' },
  archived: { label: '已归档', variant: 'gray' },
}

// ── 结算状态 ──
export const SETTLEMENT_STATUS: Record<string, StatusConfig> = {
  draft: { label: '草稿', variant: 'gray' },
  pending: { label: '未办理', variant: 'warning' },
  processed: { label: '已办理', variant: 'success' },
  completed: { label: '已办理', variant: 'success' },
  archived: { label: '已归档', variant: 'primary' },
}

// ── 发票状态（收票）──
export const INVOICE_IN_STATUS: Record<string, StatusConfig> = {
  issued: { label: '已收票', variant: 'info' },
  partial: { label: '部分付款', variant: 'warning' },
  paid: { label: '已付清', variant: 'success' },
}

// ── 发票状态（开票）──
export const INVOICE_OUT_STATUS: Record<string, StatusConfig> = {
  issued: { label: '已开具', variant: 'info' },
  partial: { label: '部分收款', variant: 'warning' },
  paid: { label: '已收齐', variant: 'success' },
}

// ── 人员状态 ──
export const MEMBER_STATUS: Record<string, StatusConfig> = {
  active: { label: '在职', variant: 'success' },
  left: { label: '已离职', variant: 'gray' },
}

// ── 工人状态 ──
export const WORKER_STATUS: Record<string, StatusConfig> = {
  active: { label: '在职', variant: 'success' },
  left: { label: '已离场', variant: 'gray' },
}

// ── 用户状态 ──
export const USER_STATUS: Record<string, StatusConfig> = {
  active: { label: '正常', variant: 'success' },
  disabled: { label: '已禁用', variant: 'danger' },
}

// ── 审计日志级别 ──
export const AUDIT_LEVEL: Record<string, StatusConfig> = {
  info: { label: '信息', variant: 'info' },
  warning: { label: '警告', variant: 'warning' },
  error: { label: '错误', variant: 'danger' },
}

// ── 合同状态 ──
export const CONTRACT_STATUS: Record<string, StatusConfig> = {
  draft: { label: '草稿', variant: 'gray' },
  active: { label: '执行中', variant: 'success' },
  completed: { label: '已完工', variant: 'primary' },
  terminated: { label: '已终止', variant: 'danger' },
}

// ── 变体 → 圆点色 + 文字色 映射（Stitch: dot + text, 非 pill badge）──
const variantDotMap: Record<string, { dot: string; text: string }> = {
  success: { dot: 'bg-success-500', text: 'text-success-700' },
  warning: { dot: 'bg-warning-500', text: 'text-warning-700' },
  danger: { dot: 'bg-danger-500', text: 'text-danger-700' },
  gray: { dot: 'bg-[color:var(--muted)]', text: 'text-[color:var(--fg-2)]' },
  primary: { dot: 'bg-primary-500', text: 'text-[color:var(--fg)]' },
  info: { dot: 'bg-[color:var(--accent)]', text: 'text-[color:var(--fg-2)]' },
  purple: { dot: 'bg-[color:var(--muted)]', text: 'text-[color:var(--fg-2)]' },
  orange: { dot: 'bg-warning-500', text: 'text-warning-700' },
  cyan: { dot: 'bg-[color:var(--muted)]', text: 'text-[color:var(--fg-2)]' },
}

/**
 * 通用状态标签组件 (Stitch: 小圆点 + 文字，取代彩色 pill)
 */
export function StatusBadge({
  status,
  config,
  fallback = '未知',
}: {
  status: string | undefined | null
  config: Record<string, StatusConfig>
  fallback?: string
}) {
  const cfg = status ? config[status] : null
  const variant = cfg?.variant ?? 'gray'
  const colors = variantDotMap[variant] || variantDotMap.gray
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colors.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors.dot}`} />
      {cfg?.label ?? fallback}
    </span>
  )
}
