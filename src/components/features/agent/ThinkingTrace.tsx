/**
 * ThinkingTrace — 可展开的思考过程块（Reasoning 形态）
 * 来源：TurboKach/ai-native-react-components（Beautiful UI thinking，MIT），按项目风格移植。
 *
 * 只移植 Reasoning 形态：工作时标题 shimmer「思考中」，完成后「已思考」
 * （fade-in 落定）。正文为网格行展开动画（grid-template-rows 0fr→1fr、
 * 400ms、cubic-bezier(0.23,1,0.32,1)）+ 左侧竖线 + 逐行 fade-up。
 * 展开 = 用户手动值 ?? working（流式思考中自动展开，完成后收起；
 * 用户手动开/过则以手动值为准）。
 *
 * 裁剪说明：原版 Steps/Search/Coding 变体的专属结构（步骤勾选/来源
 * 链接/工具按钮行）与 useSequence 演示推进循环不移植——本组件由
 * MessageBubble 以真实 reasoning 文本 + working 态驱动。
 */

import React, { useState } from 'react'
import { Icon } from '@/components/ui/Icon'

/** fade-up 逐行入场的延迟封顶（长思考文本避免末行延迟过长） */
const MAX_STAGGER = 8

interface ThinkingTraceProps {
  /** 思考过程文本（按换行拆分为逐行展示） */
  reasoning: string
  /** 是否仍在思考（流式进行中；true = shimmer「思考中」+ 自动展开） */
  working: boolean
}

const ThinkingTrace: React.FC<ThinkingTraceProps> = ({ reasoning, working }) => {
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(null)
  const expanded = manualExpanded ?? working
  const lines = reasoning.split('\n').filter((l) => l.trim().length > 0)

  return (
    <div className="flex w-full max-w-md flex-col">
      {/* 标题行：点击展开/收起 */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setManualExpanded((current) => !(current ?? working))}
        className="-mx-1.5 flex w-fit items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-100 hover:bg-[color:var(--panel-2)]"
      >
        <span style={{ color: working ? 'var(--fg-2)' : 'var(--muted)' }}>
          <Icon name="Brain" size={14} />
        </span>
        {working ? (
          <span
            className="bg-clip-text text-sm font-medium text-transparent"
            style={{
              backgroundImage: 'linear-gradient(90deg, var(--muted) 35%, var(--fg) 50%, var(--muted) 65%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-text 1.4s linear infinite',
            }}
          >
            思考中
          </span>
        ) : (
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--muted)', animation: 'fade-in 350ms ease-out both' }}
          >
            已思考
          </span>
        )}
        <span
          className="transition-transform duration-300"
          style={{ color: 'var(--muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <Icon name="ChevronDown" size={14} />
        </span>
      </button>

      {/* 展开内容：网格行 0fr→1fr + 左侧竖线 + 逐行 fade-up */}
      <div
        className="grid transition-[grid-template-rows,opacity] duration-[400ms]"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
          opacity: expanded ? 1 : 0,
          transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div className="overflow-hidden">
          <div className="relative mt-1 ml-[5px] py-1 pl-4">
            <span
              aria-hidden
              className="absolute bottom-1 left-[3px] top-1 w-px"
              style={{ backgroundColor: 'var(--border)' }}
            />
            {/* max-h-64 + 滚动：超长 reasoning 不再撑高消息气泡（沿用旧 ReasoningRow 的 max-h-64） */}
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {lines.map((line, i) => (
                <span
                  key={i}
                  className="whitespace-pre-wrap break-words text-xs leading-relaxed"
                  style={{
                    color: 'var(--muted)',
                    animation: `fade-up 320ms cubic-bezier(0.23, 1, 0.32, 1) ${Math.min(i, MAX_STAGGER) * 120}ms both`,
                  }}
                >
                  {line}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThinkingTrace
