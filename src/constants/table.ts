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
 * 因此 bodyRow 不再包含 hover:bg，避免重复。
 */
export const TABLE = {
  /** 表格外层容器 */
  container:
    'bg-[color:var(--card)] rounded-xl shadow-sm border border-[color:var(--border)] overflow-hidden',

  /** <table> 元素 */
  table: 'w-full border-separate border-spacing-0',

  /** <thead> 行 — 包含底部边框，与表体分隔 */
  headerRow: 'bg-[color:var(--panel-2)] border-b border-[color:var(--border)]',

  /** <th> 单元格 — 默认左对齐、加粗、大写（Stitch label-caps） */
  headerCell:
    'px-4 py-2.5 text-left text-xs font-semibold text-[color:var(--muted)] uppercase tracking-wider whitespace-nowrap',

  /** 粘性表头（配合 overflow-auto 容器使用） */
  stickyHeader: 'sticky top-0 z-10',

  /** <tbody> 表体行 — 顶部分隔线 + 过渡 */
  bodyRow: 'border-t border-[color:var(--border)] transition-colors',

  /** <td> 单元格 */
  bodyCell: 'px-4 py-2.5 text-sm text-[color:var(--fg-2)]',

  /** <td> 左对齐修饰 */
  cellLeft: 'text-left',

  /** <td> 居中对齐修饰 */
  cellCenter: 'text-center',

  /** <td> 右对齐修饰 */
  cellRight: 'text-right',
} as const
