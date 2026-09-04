/**
 * report-client.ts — 报告生成 API 客户端
 *
 * 调用 POST /api/reports/generate 生成 Markdown 格式报告
 */

import { apiClient } from './api-client'

export interface ReportRequest {
  period: 'day' | 'week' | 'month'
  startDate?: string
  endDate?: string
  scope: 'all' | 'project' | 'user'
  scopeId?: number
  actionFilter?: string[]
  /** 报告形式：text=文本版（缺省）；chart=图形版（每节一图+大数字，例会投影用） */
  format?: 'text' | 'chart'
  /** 报告主题：general=综合经营（缺省）；wage=工资专项（工资台账聚合，老板视角工资月报） */
  theme?: 'general' | 'wage'
}

export interface ReportResponse {
  markdown: string
  timestamp: string
}

/**
 * 生成报告
 */
export function generateReport(request: ReportRequest): Promise<{
  success: boolean
  data?: ReportResponse
  error?: string
}> {
  return apiClient.post<ReportResponse>('/api/reports/generate', request)
}
