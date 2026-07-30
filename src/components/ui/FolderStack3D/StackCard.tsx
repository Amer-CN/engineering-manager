// StackCard.tsx — FolderStack3D 卡面（纯展示）
// 姿态（transform/opacity/filter/态类名）全部由 useWheelStack 的 rAF 逐帧直写，
// 本组件只负责静态卡面内容；memo 隔离——聚焦索引变化重渲染舞台时卡面不重绘。
import { memo } from 'react'
import type { StackGroup } from './types'

interface StackCardProps {
  group: StackGroup
  index: number
  cardId: string
  selected: boolean
  refFn: (el: HTMLDivElement | null) => void
  onClick: (index: number) => void
}

export const StackCard = memo(function StackCard({ group, index, cardId, selected, refFn, onClick }: StackCardProps) {
  return (
    // 卡片姿态类由 rAF 直写管理（React 不 diff 实际 DOM 的 className，重渲染不会覆盖）；
    // 初始 fs3d-hide 避免首帧 40 张叠在原点（useLayoutEffect 首次 renderFrame 立即摆位）
    <div
      ref={refFn}
      id={cardId}
      role="option"
      aria-selected={selected}
      className="fs3d-card fs3d-hide"
      onClick={() => onClick(index)}
    >
      <div className="fs3d-body">
        <div className="fs3d-disc">{group.name}</div>
        {group.meta && <div className="fs3d-meta">{group.meta}</div>}
        <div className="fs3d-lines"><i /><i /><i /></div>
        {group.stats && group.stats.length > 0 && (
          <div className="fs3d-stats">
            {group.stats.map(s => (
              <span key={s.label}>{s.label} <b>{s.value}</b></span>
            ))}
          </div>
        )}
        <div className="fs3d-num">
          {group.primaryValue}
          {group.primaryUnit && <u>{group.primaryUnit}</u>}
        </div>
        {group.primaryLabel && <div className="fs3d-numlabel">{group.primaryLabel}</div>}
        {group.state && (
          <div className={`fs3d-st ${group.state.level === 'ok' ? '' : group.state.level}`}>
            <i />{group.state.text}
          </div>
        )}
      </div>
      <div className="fs3d-tab">{group.name}</div>
    </div>
  )
})
