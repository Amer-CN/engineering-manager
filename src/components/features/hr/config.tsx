/**
 * 人事管理模块配置常量
 */

export const HR_DEPT_COLORS: Record<string, string> = {
  '工程部': 'bg-blue-100 text-blue-800',
  '财务部': 'bg-emerald-100 text-emerald-800',
  '行政部': 'bg-violet-100 text-violet-800',
  '人事部': 'bg-amber-100 text-amber-800',
  '技术部': 'bg-cyan-100 text-cyan-800',
}

export const HR_STATUS_LABELS: Record<string, string> = {
  active: '在职',
  left: '离职',
}

export const HR_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  left: 'bg-slate-100 text-slate-500',
}