/**
 * 统一表格样式常量 — 唯一的样式来源
 *
 * 使用规则：
 * - <table>  → TABLE.table
 * - <thead>  → TABLE.headerRow + TABLE.stickyHeader
 * - <th>     → TABLE.headerCell (+ 对齐修饰)
 * - <tr>     → TABLE.bodyRow (+ 点击光标)
 * - <td>     → TABLE.bodyCell (+ 对齐/修饰)
 *
 * 全局 CSS 已为所有 table tbody tr 定义了 hover 高亮，
 * 因此 bodyRow 不再包含 hover:bg-slate-50，避免重复。
 */
export const TABLE = {
  /** 表格外层容器 */
  container:
    'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden',

  /** <table> 元素 */
  table: 'w-full border-separate border-spacing-0',

  /** <thead> 行 — 包含底部边框，与表体分隔 */
  headerRow: 'bg-slate-50 border-b border-slate-200',

  /** <th> 单元格 — 默认左对齐、加粗、大写 */
  headerCell:
    'px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap',

  /** 粘性表头（配合 overflow-auto 容器使用） */
  stickyHeader: 'sticky top-0 z-10',

  /** <tbody> 表体行 — 顶部分隔线 + 过渡 */
  bodyRow: 'border-t border-slate-100 transition-colors',

  /** <td> 单元格 */
  bodyCell: 'px-4 py-3 text-sm text-slate-700',

  /** <td> 左对齐修饰 */
  cellLeft: 'text-left',

  /** <td> 居中对齐修饰 */
  cellCenter: 'text-center',

  /** <td> 右对齐修饰 */
  cellRight: 'text-right',
} as const
