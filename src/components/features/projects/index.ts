/**
 * Projects 功能模块入口
 * 
 * 统一导出所有项目相关组件
 */

// 项目列表
export { ProjectList } from './ProjectList'
export type { ProjectListProps } from './ProjectList'

// 项目表单
export { ProjectForm } from './ProjectForm'
export type { ProjectFormProps, ProjectFormData } from './ProjectForm'

// 项目详情
export { ProjectDetail } from './ProjectDetail'
export type { ProjectDetailProps } from './ProjectDetail'

// 项目卡片
export { ProjectCard } from './ProjectCard'
export type { ProjectCardProps } from './ProjectCard'

// 项目表格（S11B）
export { ProjectTable } from './ProjectTable'
export type { ProjectTableProps } from './ProjectTable'

// 项目筛选
export { ProjectFilters } from './ProjectFilters'
export type { ProjectFiltersProps } from './ProjectFilters'

// 项目统计
export { ProjectStats } from './ProjectStats'
export type { ProjectStatsData } from './ProjectStats'

// 项目指挥中心
export { ProjectCommandCenter } from './ProjectCommandCenter'
export type { ProjectCommandCenterProps } from './ProjectCommandCenter'

// 项目时间线
export { ProjectTimeline } from './ProjectTimeline'

// 告警条
export { AlertBar } from './AlertBar'
export type { AlertItem } from './AlertBar'
