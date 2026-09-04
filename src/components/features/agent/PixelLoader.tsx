/**
 * PixelLoader — 3×3 像素网格加载指示器
 * 来源：TurboKach/ai-native-react-components（Beautiful UI loading-state，MIT），按项目风格移植。
 *
 * - 像素网格：chevron 波前延迟（列 + |行-1|）× 90ms，650ms 循环短于整轮扫掠，
 *   始终有两个波前在途
 * - shimmer 文字：bg-clip-text 渐变扫光（--muted → --fg → --muted）
 * - 计时器：等宽 tabular-nums，0.1s 步进；<60s 显示 0.0s，之后 1m 30.0s
 * - prefers-reduced-motion：由 index.css 既有全局规则承接（动画时长归零 →
 *   网格冻结为暗态、shimmer 静止），计时器为 JS interval 继续走
 *
 * 用途：AgentDashboard 等待回复时的「思考中」占位（替代 Loader2 裸转圈）。
 */

import React, { useEffect, useState } from 'react'

/** chevron 波前：第 i 格（r=行 c=列）的动画延迟（ms） */
const CHEVRON_DELAYS = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3)
  const c = i % 3
  return (c + Math.abs(r - 1)) * 90
})

/** 波前循环时长（ms） */
const CYCLE_MS = 650

/** 计时器：0.1s 步进，<60s 用秒（0.0s），≥60s 用分（1m 30.0s） */
function useElapsed(): string {
  const [ds, setDs] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setDs((d) => d + 1), 100)
    return () => window.clearInterval(t)
  }, [])
  const total = ds / 10
  if (total < 60) return `${total.toFixed(1)}s`
  return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`
}

interface PixelLoaderProps {
  /** shimmer 文案（默认「思考中」） */
  label?: string
}

const PixelLoader: React.FC<PixelLoaderProps> = ({ label = '思考中' }) => {
  const elapsed = useElapsed()

  return (
    <div className="flex w-fit items-center gap-2.5">
      <span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[1.5px]">
        {CHEVRON_DELAYS.map((d, i) => (
          <span
            key={i}
            className="size-[4px] rounded-[1px]"
            style={{
              backgroundColor: 'var(--fg-2)',
              opacity: 0.15,
              animation: `pixel-on ${CYCLE_MS}ms ease-in-out ${d}ms infinite`,
            }}
          />
        ))}
      </span>
      <span
        className="bg-clip-text text-sm font-medium text-transparent"
        style={{
          backgroundImage: 'linear-gradient(90deg, var(--muted) 35%, var(--fg) 50%, var(--muted) 65%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-text 1.4s linear infinite',
        }}
      >
        {label}
      </span>
      <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--muted)' }}>
        {elapsed}
      </span>
    </div>
  )
}

export default PixelLoader
