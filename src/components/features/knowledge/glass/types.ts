/**
 * glass 轮播数据模型
 *
 * M2 演示模型（对应参考项目 types.ts）；M3 接入真实 API 时在此映射：
 * FolderItem.title = 文件夹名，projectId = 所属项目（M3 增补），
 * period = 创建周期/项目阶段，progress = 文档完成度，documents = 库内文档。
 */

export interface DocumentItem {
  id: string
  title: string
  code: string
  priority: '高' | '中' | '低'
  status: '已完成' | '进行中' | '未开始' | '待评审'
  date: string
  assignee: string
}

export interface FolderItem {
  id: string
  title: string
  englishTitle?: string
  /** 创建周期 / 项目阶段，如 "2026 · Q2" */
  period: string
  /** 0-100 文档完成度；可空（未设置时 badge 隐藏进度块） */
  progress: number | null
  /** 关联人数或文档数 */
  memberCount: number
  highlightColor?: 'emerald' | 'cyan' | 'purple' | 'amber' | 'blue'
  category: string
  documents: DocumentItem[]
  description?: string
}
