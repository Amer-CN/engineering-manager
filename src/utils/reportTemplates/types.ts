/** 报告模板共享类型——三用途 × 三模板（R01/R05/R12）+ 已有 R04 */

export type ReportTemplateId = 'r04' | 'r01' | 'r05' | 'r12'

/** purpose → templateId 映射（写死，后端不感知） */
export const PURPOSE_TEMPLATE: Record<string, ReportTemplateId> = {
  review: 'r04',
  evidence: 'r01',
  work: 'r05',
  weekly: 'r12',
}

/**
 * 用途 + 主题 → templateId。经营复盘（review）带主题维度：
 * 综合经营 → r04 图表版、工资专项 → r12 工资海报版（用户契约：一个用途两种模板）；
 * 其余用途不看主题。未知 → r04。
 */
export function getTemplateId(purpose: string | undefined, theme?: string): ReportTemplateId {
  if (purpose === 'review' && theme === 'wage') return 'r12'
  return PURPOSE_TEMPLATE[purpose ?? 'review'] ?? 'r04'
}

/** 报告打印数据包（三模板共用同一数据形状，版式由模板决定） */
export interface TemplateReportData {
  title: string
  period: string
  meta: {
    product: string
    generatedBy: string
    dataSource: string
    date: string
  }
  sections: {
    name: string | null
    heading: string
    lines: string[]
    tables?: { headers: string[]; rows: string[][] }[]
  }[]
  charts?: {
    waffle?: { title: string; rows: { name: string; pct: number; color: string }[] }
    topBars?: { title: string; unit: string; rows: { name: string; value: number }[] }
    trend?: { title: string; unit: string; points: { x: string; y: number }[] }
    bigNumbers?: { value: string; label: string; sub: string }[]
  }
}

/** 从 colorPresets.ts 转写——R01/R05/R12 各自的预设色值（与 color-presets.js 正本一致） */
export const PORCELAIN = {
  bg: '#F7F2EB', txt: '#081F5C',
  mut: 'rgba(8,31,92,.60)', lab: 'rgba(8,31,92,.72)',
  faint: 'rgba(8,31,92,.32)', grid: 'rgba(8,31,92,.16)',
  data: '#334EAC', data2: '#7096D1', hero: '#081F5C', faintData: '#BAD6EB',
  cat4: ['#081F5C', '#334EAC', '#7096D1', '#BAD6EB'] as string[],
  railBg: '#334EAC', railDark: '#081F5C',
  serif: "'Source Serif 4','Noto Serif SC','Songti SC',serif",
  sans: "'Inter','Noto Sans SC',sans-serif",
}

export const MONO = {
  bg: '#F0EFEB', txt: '#1C1C1A',
  mut: '#8F8E88', faint: '#C6C5BF', grid: '#DEDDD6',
  ink: '#1C1C1A', paper: '#F0EFEB',
}

export const PALM = {
  bg: '#F0EFEB', txt: '#58402E',
  mut: 'rgba(88,64,46,.60)', lab: 'rgba(88,64,46,.72)',
  faint: 'rgba(88,64,46,.32)', grid: 'rgba(88,64,46,.16)',
  data: '#43593B', data2: '#58402E', hero: '#D4A017',
  faintData: '#ACAD79', bead: '#77835A',
  ramp: ['#F2D17E', '#ACAD79', '#929960', '#77835A', '#43593B'] as string[],
  ser: ['#43593B', '#D4A017', '#77835A', '#F2D17E', '#ACAD79', '#58402E'] as string[],
}

/** escapeHtml——三模板共用（与 templateMarkup.ts 同口径） */
export function tplEscapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** SVG name 转义 */
export function tplEscapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
