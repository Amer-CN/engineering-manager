/**
 * ToolCallChips — 工具调用 chips 行（三态：进行中 / 已完成 / 失败）
 * 来源：TurboKach/ai-native-react-components（Beautiful UI tool-chips + task-rows，MIT），按项目风格移植。
 *
 * 每个工具一行：行首徽章（running=旋转环 / done=绿✓ / failed=红✗，pop-in）
 * + 工具名（中文标签）+ chip（原始名 mono）+ 尾部状态小 pill；
 * hover 徽章位显 chevron，点击整行展开/收起详情行（grid-template-rows
 * 0fr→1fr 网格展开 + 左侧竖线）。组件为受控 props，由 useAgentConversationFlow
 * 维护的 in-flight 工具数组驱动：onTool 入列 running，onDone/onError 翻转终态，
 * 完成后保留显示终态（本轮工具摘要），下一轮 send 时由 flow 重置。
 *
 * 裁剪说明（演示数据 → 真实状态）：原版 useSequence 步进循环、ROWS 假数据、
 * DIFFS 文件 diff chips 块不移植；工具「结果」卡仍由 RichToolResult 渲染。
 */

import React, { useState } from 'react'
import { toolLabel } from './richToolResult.utils'

/** 工具运行状态 */
export type InFlightToolStatus = 'running' | 'done' | 'failed'

/** 在途/终态工具条目（useAgentConversationFlow 维护，视图层只读） */
export interface InFlightTool {
  /** 唯一标识（同一工具一轮内可能多次调用，用序号区分） */
  id: string
  /** 原始工具名（如 getProjects） */
  name: string
  /** 运行状态（缺省按 running 展示） */
  status?: InFlightToolStatus
}

/** 状态 → 尾部 pill 文案 */
const STATUS_PILL: Record<'running' | 'done' | 'failed', string> = {
  running: '进行中',
  done: '已完成',
  failed: '失败',
}

/** 终态徽章（对齐 task-rows 的 Badge：圆形色底 + pop-in） */
function StatusBadge({ tone, label }: { tone: 'done' | 'failed'; label: string }) {
  return (
    <span
      role="img"
      aria-label={label}
      className="flex size-[16px] shrink-0 items-center justify-center rounded-full"
      style={{
        background: tone === 'done' ? 'var(--success)' : 'var(--danger)',
        color: 'var(--on-accent)',
        animation: 'pop-in 300ms cubic-bezier(0.23,1,0.32,1) both',
      }}
    >
      {tone === 'done' ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      ) : (
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      )}
    </span>
  )
}

/** 运行中旋转环（对齐 task-rows 的 SpinnerRing：底环静止 + 弧段旋转） */
function SpinnerRing() {
  const size = 16
  const stroke = 2
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <span role="img" aria-label="进行中" className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 animate-spin">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--fg-2)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${c * 0.28} ${c * 0.72}`}
        />
      </svg>
    </span>
  )
}

interface ToolCallChipsProps {
  /** 工具列表（空数组 → 整体不渲染） */
  tools: InFlightTool[]
}

const ToolCallChips: React.FC<ToolCallChipsProps> = ({ tools }) => {
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  if (tools.length === 0) return null

  const toggleRow = (id: string) =>
    setOpenRows((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="flex flex-col gap-1">
      {tools.map((tool) => {
        const status = tool.status ?? 'running'
        const rowOpen = openRows.has(tool.id)
        return (
          <div
            key={tool.id}
            style={{ animation: 'fade-up 300ms cubic-bezier(0.23, 1, 0.32, 1) both' }}
          >
            <button
              type="button"
              aria-expanded={rowOpen}
              onClick={() => toggleRow(tool.id)}
              className="group/row flex h-7 w-full min-w-0 items-center gap-2 rounded-md px-[3px] text-left transition-colors duration-100 hover:bg-[color:var(--panel-2)]"
            >
              <span className="relative flex size-4 shrink-0 items-center justify-center">
                <span
                  className={`transition-opacity duration-100 group-hover/row:opacity-0 ${rowOpen ? 'opacity-0' : ''}`}
                >
                  {status === 'running' ? <SpinnerRing /> : <StatusBadge tone={status} label={status === 'done' ? '成功' : '失败'} />}
                </span>
                <span
                  className={`absolute transition-opacity duration-150 group-hover/row:opacity-100 ${rowOpen ? 'opacity-100' : 'opacity-0'}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--fg-2)' }}>
                {toolLabel(tool.name)}
              </span>
              <span
                className="inline-flex h-[22px] min-w-0 flex-1 items-center truncate rounded-md px-1.5 font-mono text-micro transition-colors duration-100 hover:bg-[color:var(--panel-2)]"
                style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}
              >
                {tool.name}
              </span>
              <span
                className="inline-flex h-[18px] shrink-0 items-center rounded-full px-1.5 text-micro font-medium"
                style={{
                  background: status === 'running' ? 'var(--panel-2)' : status === 'done' ? 'var(--success-soft)' : 'var(--danger-soft)',
                  color: status === 'running' ? 'var(--muted)' : status === 'done' ? 'var(--success)' : 'var(--danger)',
                  animation: status === 'running' ? undefined : 'fade-in 200ms ease-out both',
                }}
              >
                {STATUS_PILL[status]}
              </span>
            </button>

            {/* 展开详情行：网格行 0fr→1fr + 左侧竖线 */}
            <div
              className="grid transition-[grid-template-rows,opacity] duration-300"
              style={{
                gridTemplateRows: rowOpen ? '1fr' : '0fr',
                opacity: rowOpen ? 1 : 0,
                transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
              }}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className="mt-0.5 mb-1 ml-2 flex flex-col gap-0.5 border-l py-0.5 pl-3.5"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="truncate font-mono text-micro leading-relaxed" style={{ color: 'var(--muted)' }}>
                    正在调用 {tool.name} …
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ToolCallChips
