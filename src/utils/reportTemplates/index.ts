/** 三模板打印 HTML 生成器入口——按 templateId 分发 */

export type { ReportTemplateId, TemplateReportData } from './types'
export { getTemplateId } from './types'

import type { TemplateReportData } from './types'
import { buildR01PrintHtml } from './r01Print'
import { buildR05PrintHtml } from './r05Print'
import { buildR12PrintHtml } from './r12Print'

export function buildTemplatePrintHtml(
  templateId: string,
  data: TemplateReportData,
): string {
  switch (templateId) {
    case 'r01':
      return buildR01PrintHtml(data)
    case 'r05':
      return buildR05PrintHtml(data)
    case 'r12':
      return buildR12PrintHtml(data)
    default:
      // 契约：未知 id 落 R01。生产调用方（ReportResultPanel）已用白名单把未知 id 兜成 'r04' 走
      // 既有 R04 管线（buildChartReportPrintHtml），本 default 实际不可达；若未来直接调用，
      // 请先经 getTemplateId 归一化（未知 purpose → 'r04'），勿依赖本分支。
      return buildR01PrintHtml(data)
  }
}
