export const categories: string[] = ['建筑图', '结构图', '电气图', '给排水图', '暖通图', '装饰图', '其他']

/**
 * 图纸类别归一（全库唯一判定点）：不在 categories 内的脏值/空值一律视为「其他」。
 * 分组计数（drawingStackGroups）、筛选（Drawings）、展示（列/画廊/查看器）必须共用本函数，
 * 禁止各处自写判定——B1 的成因就是「分组一套逻辑、筛选另一套」导致口径漂移。
 * 注：脏类别数据本身是数据质量问题（已另行记账），本函数只做展示层兑底，不改写存储值。
 */
export function normalizeDrawingCategory(category?: string | null): string {
  return category && categories.includes(category) ? category : '其他'
}

export const categoryIcons: Record<string, string> = {
  '建筑图': 'Building2',
  '结构图': 'Ruler',
  '电气图': 'Zap',
  '给排水图': 'Droplets',
  '暖通图': 'Wrench',
  '装饰图': 'PaintBucket',
  '其他': 'File'
}

export const categoryColors: Record<string, string> = {
  '建筑图': 'bg-[color:var(--panel-2)] text-[color:var(--fg)]',
  '结构图': 'bg-[color:var(--panel-2)] text-[color:var(--fg)]',
  '电气图': 'bg-[color:var(--panel-2)] text-[color:var(--fg)]',
  '给排水图': 'bg-[color:var(--panel-2)] text-[color:var(--fg)]',
  '暖通图': 'bg-[color:var(--panel-2)] text-[color:var(--fg)]',
  '装饰图': 'bg-[color:var(--panel-2)] text-[color:var(--fg)]',
  '其他': 'bg-[color:var(--panel-2)] text-[color:var(--fg)]'
}
