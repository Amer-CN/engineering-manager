/**
 * UI 组件入口文件
 * 
 * 统一导出所有基础 UI 组件
 */

// 按钮
export { Button } from './Button/Button'
export type { ButtonProps } from './Button/Button'

// 输入框
export { Input } from './Input/Input'
export type { InputProps } from './Input/Input'

// 多行输入框
export { Textarea } from './Textarea/Textarea'
export type { TextareaProps } from './Textarea/Textarea'

// 模态框
export { Modal } from './Modal/Modal'
export type { ModalProps } from './Modal/Modal'

// 卡片
export { Card } from './Card/Card'
export type { CardProps } from './Card/Card'

// 徽章
export { Badge } from './Badge/Badge'
export type { BadgeProps } from './Badge/Badge'

// 选择器
export { Select } from './Select/Select'
export type { SelectOption, SelectProps } from './Select/Select'

// 分页
export { Pagination } from './Pagination/Pagination'
export type { PaginationProps } from './Pagination/Pagination'

// 加载
export { Spinner, Skeleton } from './Loading/Loading'
export type { SpinnerProps, SkeletonProps } from './Loading/Loading'

// 空状态
export { EmptyState } from './EmptyState'
export type { EmptyStateProps } from './EmptyState'

// 确认对话框
export { ConfirmDialog } from './ConfirmDialog/ConfirmDialog'
export type { ConfirmDialogProps } from './ConfirmDialog/ConfirmDialog'

// 图标
export { Icon } from './Icon'
export type { IconProps } from './Icon'

// 下拉菜单
export { DropdownMenu } from './DropdownMenu'
export type { DropdownMenuItem } from './DropdownMenu'

// 标签页
export { Tabs } from './Tabs'
export type { TabsProps } from './Tabs'

// 工具提示
export { Tooltip } from './Tooltip'
export type { TooltipProps } from './Tooltip'

// 页面容器
export { default as PageContainer } from './PageContainer'

// 筛选栏
export { default as FilterBar } from './FilterBar'

// 表单步骤条 (S20 Stitch)
export { FormStepper } from './FormStepper'

// 分区标题 (S14 Stitch)
export { SectionHeader } from './SectionHeader'

// Hero 横幅（组件创建后将取消注释）
// export { HeroBanner } from './HeroBanner'
// export type { HeroBannerProps } from './HeroBanner'
