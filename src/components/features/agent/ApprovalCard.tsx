/**
 * ApprovalCard — agent 行动确认卡（建议 → 用户确认 → 执行）
 * 来源：TurboKach/ai-native-react-components（Beautiful UI recommendation-card，MIT），
 * 视觉与交互基准 .work/reference/beautifului/recommendation-card.tsx 裁剪与受控化移植：
 *  - 演示数据（OPTIONS 假数据）不移植 → 全部受控 props（requestId/title/body/options/onResolve/resolved）
 *  - 原版 surface/shadow 卡片体系 → 项目 ToolResultCard 卡片风格（var(--card) 底 + var(--border) 边，rounded-xl）
 *  - 原版 ctaStyle 自绘按钮 → 主按钮用项目 <Button variant="primary">，次按钮普通样式
 *  - 原版 var(--green)/var(--orange) tone → TONE_COLORS 语义变量映射（对齐 DataTable.tsx 现成写法）
 *  - 「其他选项」抽屉：grid-template-rows 0fr↔1fr 展开（同 ToolCallChips 展开语法），抽屉内点选即 resolve
 *  - 已决态：resolved 非空 → 收起交互（主按钮/切换/抽屉不渲染），显示「已选择：{label}」+ 绿✓ Badge pop-in
 *  - 入场：motion.div fade-up（对齐 RichToolResult 入场）
 *
 * 类型契约见 src/types/agent.ts（ApprovalOption/ApprovalRequest/ApprovalResolution），
 * 是后端「建议→确认→执行」协议对表用的接口文档。
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import type { ApprovalOption } from '@/types/agent'

export type { ApprovalOption }

/** 确认卡 props（受控：已决态由父级传入，卡片不内持最终决定） */
export interface ApprovalCardProps {
  /** 本轮确认请求的唯一 ID（后端协议对账用） */
  requestId: string
  /** 标题（如「是否将这 3 张发票标记为已收齐？」） */
  title: string
  /** 行动详情正文（支持富文本/代码 chip；空/缺省不渲染正文块） */
  body?: React.ReactNode
  /** 选项（≥1；primary 标记的作为 footer 主按钮，其余进抽屉） */
  options: ApprovalOption[]
  /** 点选任一选项（含主按钮/抽屉内）回调 */
  onResolve: (requestId: string, option: ApprovalOption) => void
  /** 已决态（历史消息回放用；非空时卡片收起交互） */
  resolved?: { option: ApprovalOption; at?: string } | null
}

/** tone → 颜色变量（info 走现有 --color-info-500 三元组变量，不新增变量；对齐 DataTable.tsx） */
const TONE_COLORS: Record<string, string> = {
  success: 'var(--success)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  info: 'rgb(var(--color-info-500))',
}

/** 3 格竖条 meter（参考源码 Meter）：前 signal 格填 tone 色，其余 var(--border) */
const Meter: React.FC<{ signal: number; tone?: ApprovalOption['tone'] }> = ({ signal, tone }) => {
  const color = (tone && TONE_COLORS[tone]) || 'var(--muted-2)'
  return (
    <span className="flex items-end gap-0.5" role="img" aria-label={`置信度 ${signal}/3`}>
      {[0, 1, 2].map((bar) => (
        <span
          key={bar}
          className="w-1 rounded-full transition-colors duration-300"
          style={{ height: 10, background: bar < signal ? color : 'var(--border)' }}
        />
      ))}
    </span>
  )
}

/** 已决徽章（对齐 ToolCallChips done 徽章：绿底圆 + 白✓，pop-in） */
const ResolvedBadge: React.FC = () => (
  <span
    role="img"
    aria-label="已确认"
    className="flex size-4 shrink-0 items-center justify-center rounded-full"
    style={{
      background: 'var(--success)',
      color: 'var(--on-accent)',
      animation: 'pop-in 300ms cubic-bezier(0.23,1,0.32,1) both',
    }}
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
  </span>
)

const ApprovalCard: React.FC<ApprovalCardProps> = ({
  requestId,
  title,
  body,
  options,
  onResolve,
  resolved = null,
}) => {
  const [open, setOpen] = useState(false)
  const isResolved = resolved != null

  if (options.length === 0) return null

  /** 主选项：primary 标记优先，否则第一个；其余选项进抽屉 */
  const primary = options.find((o) => o.primary) ?? options[0]
  const others = options.filter((o) => o !== primary)

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="mt-2 w-full"
    >
      <div
        className="overflow-hidden rounded-xl border"
        style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
      >
        {/* 标题 + 行动详情正文（正文空时整块不渲染） */}
        <div className="px-3 py-2.5">
          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{title}</span>
          {body != null && body !== '' && (
            <div className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--fg-2)' }}>{body}</div>
          )}
        </div>

        {/* 其他选项抽屉：网格行 0fr↔1fr 展开（参考源码 Alternatives 抽屉；已决态整体不渲染） */}
        {!isResolved && others.length > 0 && (
          <div
            className="grid transition-[grid-template-rows,opacity] duration-300"
            style={{
              gridTemplateRows: open ? '1fr' : '0fr',
              opacity: open ? 1 : 0,
              transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
            }}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className="border-t px-2 py-2"
                style={{ background: 'var(--panel-2)', borderColor: 'var(--border)' }}
              >
                {others.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => onResolve(requestId, o)}
                    className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left transition-colors duration-100 hover:bg-[color:var(--card)]"
                  >
                    <Meter signal={o.signal ?? 0} tone={o.tone} />
                    <span className="min-w-0 flex-1 truncate text-xs" style={{ color: 'var(--fg)' }}>
                      {o.short ?? o.label}
                    </span>
                    <span className="shrink-0 text-micro" style={{ color: 'var(--muted)' }}>
                      {o.signalLabel ?? o.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 底部：置信度 meter · 其他选项切换 + 主按钮 / 已决徽章 */}
        <div className="flex items-center justify-between gap-3 border-t px-3 py-2" style={{ borderColor: 'var(--border)' }}>
          <span className="flex min-w-0 items-center gap-2">
            <Meter signal={primary.signal ?? 0} tone={primary.tone} />
            {primary.signalLabel && (
              <span className="truncate text-xs font-medium" style={{ color: 'var(--fg-2)' }}>
                {primary.signalLabel}
              </span>
            )}
          </span>

          <span className="flex shrink-0 items-center gap-2">
            {isResolved ? (
              <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--success)' }}>
                <ResolvedBadge />
                已选择：{resolved.option.label}
              </span>
            ) : (
              <>
                {others.length > 0 && (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setOpen((current) => !current)}
                    className="flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors duration-100 hover:bg-[color:var(--panel-2)] active:scale-[0.97]"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-2)' }}
                  >
                    其他选项
                    <span
                      className="inline-flex transition-transform duration-200"
                      style={{ transform: open ? 'rotate(180deg)' : 'none' }}
                    >
                      <Icon name="ChevronDown" size={12} />
                    </span>
                  </button>
                )}
                <Button variant="primary" size="sm" onClick={() => onResolve(requestId, primary)}>
                  {primary.label}
                </Button>
              </>
            )}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

export default ApprovalCard
