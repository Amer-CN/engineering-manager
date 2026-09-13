/**
 * ReportPickSections — ReportGeneratorModal 的纯函数层：二选一卡片节与选项常量。
 * 从 ReportGeneratorModal 机械搬移（零逻辑改动），表单渲染口径不变。
 */
import type { ReportFormat, ReportTheme } from './ReportGeneratorModal'

/** 报告主题二选一（默认综合经营） */
export const THEME_OPTIONS: { value: ReportTheme; label: string; desc: string }[] = [{ value: 'general', label: '综合经营', desc: '操作记录+业务 KPI，全局经营视角' }, { value: 'wage', label: '工资专项', desc: '工资总额/项目分布/走势/用工构成，老板视角' }]

/** 报告形式二选一（默认文本版，零惊讶） */
export const FORMAT_OPTIONS: { value: ReportFormat; label: string; desc: string }[] = [{ value: 'text', label: '文本版', desc: '全文+表格+附图，适合存档细读' }, { value: 'chart', label: '图形版', desc: '每节一图+大数字，适合例会投影' }]

export const ACTION_OPTIONS = [{ value: 'create', label: '新增' }, { value: 'update', label: '修改' }, { value: 'delete', label: '删除' }, { value: 'export', label: '导出' }, { value: 'import', label: '导入' }, { value: 'login', label: '登录' }, { value: 'logout', label: '登出' }]

/** 「报告主题」「报告形式」共用的二选一卡片节（DOM 与原内联版一致，控制文件行数在铁律上限内） */
export function renderPickSection<T extends string>(
  title: string, options: { value: T; label: string; desc: string }[], active: T, onPick: (value: T) => void
) {
  return (
    <div>
      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--fg-2)' }}>{title}</label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((o) => {
          const isActive = active === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onPick(o.value)}
              className="rounded-lg border px-3 py-2.5 text-left transition-colors"
              style={{
                borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                background: isActive ? 'var(--accent-soft, var(--bg))' : 'transparent',
              }}
            >
              <div className="text-xs font-bold" style={{ color: isActive ? 'var(--fg)' : 'var(--fg-2)' }}>{o.label}</div>
              <div className="text-caption mt-1" style={{ color: 'var(--muted)' }}>{o.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
