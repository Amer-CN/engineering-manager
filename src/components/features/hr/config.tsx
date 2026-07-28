/**
 * 人事管理模块配置常量
 */

export const HR_DEPT_COLORS: Record<string, string> = {
  '工程部': 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
  '财务部': 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
  '行政部': 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
  '人事部': 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
  '技术部': 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]',
}

export const HR_STATUS_LABELS: Record<string, string> = {
  active: '在职',
  left: '离职',
}

export const HR_STATUS_COLORS: Record<string, string> = {
  active: 'bg-success-500/10 text-success-600 border border-success-500/20',
  left: 'bg-[color:var(--panel-2)] text-[color:var(--muted)] border border-[color:var(--border)]',
}