// v0.77.0: 从 DataTable.tsx 拆出类型定义
import React from 'react'

export interface Column<T> {
  /** 数据字段名 */
  key: string
  /** 表头文字 */
  title: string
  /** 列宽（CSS 值） */
  width?: string
  /** 文本对齐 */
  align?: 'left' | 'center' | 'right'
  /** 是否可排序 */
  sortable?: boolean
  /** 自定义排序比较器 */
  sorter?: (a: T, b: T) => number
  /** 自定义单元格渲染 */
  render?: (item: T, index: number) => React.ReactNode
  /** 自定义表头渲染（覆盖 title） */
  headerRender?: React.ReactNode
  /** 列头筛选 */
  filterable?: boolean | 'select'
  /** 筛选选项（filterable='select' 时必填） */
  filterOptions?: { label: string; value: string }[]
  /** 筛选占位符 */
  filterPlaceholder?: string
  /** 获取筛选值的函数（默认读 item[key]） */
  filterAccessor?: (item: T) => string
}

export interface DataTableProps<T> {
  /** 数据列表 */
  data: T[]
  /** 列配置 */
  columns: Column<T>[]
  /** 行唯一标识 */
  rowKey: keyof T | ((item: T) => string)
  /** 行点击回调 */
  onRowClick?: (item: T) => void

  // ── 排序 ──
  /** 默认排序字段 */
  defaultSortKey?: string
  /** 默认排序方向 */
  defaultSortOrder?: 'asc' | 'desc'
  /** 排序变化回调 */
  onSortChange?: (sortKey: string | null, sortOrder: 'asc' | 'desc') => void

  // ── 分页 ──
  /** 启用分页（默认 true） */
  pagination?: boolean
  /** 每页条数选项 */
  pageSizeOptions?: number[]
  /** 默认每页条数 */
  defaultPageSize?: number

  // ── 状态 ──
  /** 加载中 — 显示骨架屏 */
  loading?: boolean
  /** 空状态文案 */
  emptyText?: string
  /** 空状态图标名称或 ReactNode */
  emptyIcon?: string | React.ReactNode

  // ── 滚动 ──
  /** 使用 HoverScrollbar 模式 */
  useHoverScrollbar?: boolean
  /** HoverScrollbar 容器 className */
  scrollClassName?: string

  // ── 外观 ──
  /** 外层容器 className（覆盖默认） */
  containerClassName?: string
  /** 是否显示外层容器（默认 true） */
  showContainer?: boolean
  /** sticky 表头（默认 true） */
  stickyHeader?: boolean

  // ── 工具栏 ──
  /** 表格上方额外操作区 */
  extraActions?: React.ReactNode
  /** 表格下方自定义内容（汇总条等） */
  footer?: React.ReactNode

}

export interface TableRowProps<T> {
  item: T
  index: number
  columns: Column<T>[]
  onClick?: (item: T) => void
  rowKeyStr: string
}

export interface ColFilterDropdownProps {
  /** 列配置 */
  col: Column<unknown>
  /** 所有数据（用于自动提取唯一值） */
  data: unknown[]
  /** 当前已选中的值集合 */
  checked: Set<string>
  /** 切换单个值 */
  onToggle: (value: string) => void
  /** 全选 */
  onSelectAll: () => void
  /** 清除全部 */
  onClear: () => void
  /** 是否激活（有筛选条件） */
  isActive: boolean
}
