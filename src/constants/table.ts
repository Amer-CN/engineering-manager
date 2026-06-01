/**
 * 统一表格样式常量
 * 所有表格组件应使用这些常量，确保全站视觉一致
 */
export const TABLE = {
  /** 表格外层容器 */
  container: 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden',
  /** 表格元素 */
  table: 'w-full border-separate border-spacing-0',
  /** 表头行 */
  headerRow: 'bg-slate-50',
  /** 表头单元格 */
  headerCell: 'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',
  /** 表体行 */
  bodyRow: 'border-t border-slate-100 hover:bg-slate-50 transition-colors',
  /** 表体单元格 */
  bodyCell: 'px-4 py-3 text-sm text-slate-700',
  /** 粘性表头（配合 overflow-auto 容器使用） */
  stickyHeader: 'sticky top-0 z-10 bg-slate-50',
} as const
