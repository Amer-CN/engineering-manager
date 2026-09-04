import React from 'react'

export type ReportPurpose = 'review' | 'evidence' | 'work'

/** 报告用途三选一（默认经营复盘）：purpose 决定 AI 措辞分支（后端），不影响取数范围 */
const PURPOSE_OPTIONS: { value: ReportPurpose; label: string; desc: string }[] = [
  { value: 'review', label: '经营复盘', desc: '老板视角 · 综合经营/工资专项 · 数据复盘与趋势判断' },
  { value: 'evidence', label: '对外举证', desc: '正式凭证 · 结算争议/银行授信/资质申报 · 零修辞数据陈述' },
  { value: 'work', label: '工作汇报', desc: '执行视角 · 我的本周/本月工作 · 第一人称、每条数据可溯源' },
]

/** 用途切换的作用域联动：work 锁定本人；evidence 隐藏按用户，当前在按用户则按权限回退（admin→全系统，否则→按项目）；其余不联动 */
function purposeScopeOverride(
  p: ReportPurpose, scope: 'all' | 'project' | 'user', isAdmin: boolean
): 'all' | 'project' | 'user' | null {
  if (p === 'work') return 'user'
  if (p === 'evidence' && scope === 'user') return isAdmin ? 'all' : 'project'
  return null
}

interface ReportPurposeSectionProps {
  purpose: ReportPurpose
  scope: 'all' | 'project' | 'user'
  isAdmin: boolean
  onPick: (value: ReportPurpose) => void
  /** 联动作用域变更回调（无需联动时不调用） */
  onScopePick: (value: 'all' | 'project' | 'user') => void
}

/**
 * 「报告用途」三卡 — 位于表单顶部，样式与「报告形式」卡片一致（三列）。
 * 从 ReportGeneratorModal 抽出（用途选择逻辑内聚），守住其 400 行铁律。
 */
const ReportPurposeSection: React.FC<ReportPurposeSectionProps> = ({
  purpose, scope, isAdmin, onPick, onScopePick,
}) => {
  return (
    <div>
      <label className="text-xs font-medium mb-2 block" style={{ color: 'var(--fg-2)' }}>报告用途</label>
      <div className="grid grid-cols-3 gap-2">
        {PURPOSE_OPTIONS.map((o) => {
          const isActive = purpose === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onPick(o.value)
                const override = purposeScopeOverride(o.value, scope, isAdmin)
                if (override) onScopePick(override)
              }}
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

export default ReportPurposeSection
