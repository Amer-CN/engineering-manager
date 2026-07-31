// types.ts — FolderStack3D 数据契约
// 语义红线（DESIGN.md § Stage Surfaces · 决策 4）：一张卡 = 一个分组，不是一行数据；上限 40。

/** 舞台局部主题：与用户可选全局外观（ThemeScheme）语义不同，刻意不共用枚举 */
export type StageTheme = 'verdant'

/** 卡数上限：超过必须强制回退扁平视图（消费方负责切换，组件防御性截断） */
export const STACK_GROUP_LIMIT = 40

export interface StackGroupStat {
  label: string
  value: string | number
}

export interface StackGroup {
  id: string | number
  /** 分组名（专业 / 版本集 / 类别） */
  name: string
  /** 卡面次行，如 "98 张 · 最新 2026-07-12" */
  meta?: string
  /** 卡面人数徽记（母版「人数图标+数字」槽位）；缺省时整行隐藏 */
  people?: number
  /** 卡面大数字（等宽 tabular） */
  primaryValue: string | number
  primaryUnit?: string
  /** 大数字下的 Label 行 */
  primaryLabel?: string
  /** 两个次级指标 */
  stats?: StackGroupStat[]
  /** 状态：颜色 + 文字双编码（The Green-Scope Rule 第 4 条） */
  state?: { level: 'ok' | 'warn' | 'danger'; text: string }
  /** 右侧详情面板行 */
  detail?: StackGroupStat[]
}
