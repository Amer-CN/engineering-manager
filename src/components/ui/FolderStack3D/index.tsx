// FolderStack3D — Stage-Surface 授权舞台区组件（DESIGN.md § Stage Surfaces）
// 首个试点：Drawings（图纸）。一张卡 = 一个分组，上限 40，超出由消费方强制回退扁平视图。
// 物理内核见 useWheelStack.ts；卡面见 StackCard.tsx；材质见 stack.css。
// prefers-reduced-motion: reduce 下不启 3D/rAF，降为横向扁平轨道。
import { useMemo, useState } from 'react'
import { useWheelStack, WINDOW_FULL, WINDOW_DOWNGRADED } from './useWheelStack'
import { StackCard } from './StackCard'
import { STACK_GROUP_LIMIT, type StackGroup, type StageTheme } from './types'
import './stack.css'

export type { StackGroup, StackGroupStat, StageTheme } from './types'
export { STACK_GROUP_LIMIT } from './types'

export interface FolderStack3DProps {
  groups: StackGroup[]
  /** Enter / 点击聚焦卡打开分组 */
  onOpen?: (group: StackGroup) => void
  /** Esc 退出舞台（消费方切回扁平视图）；未提供时回落 blur */
  onExit?: () => void
  ariaLabel: string
  /** 舞台局部主题（data-theme 只作用于舞台子树，不碰全局外观） */
  stageTheme?: StageTheme
}

function useReducedMotion(): boolean {
  // 一次性读取即可（会话内系统偏好变化直接刷新页面生效）；jsdom 无 matchMedia 时防御
  return useMemo(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )
}

export function FolderStack3D({ groups, onOpen, onExit, ariaLabel, stageTheme = 'verdant' }: FolderStack3DProps) {
  // 防御性截断：>40 应由消费方回退列表，组件兜底不渲染超限卡
  const capped = groups.length > STACK_GROUP_LIMIT ? groups.slice(0, STACK_GROUP_LIMIT) : groups
  const reduced = useReducedMotion()

  const { stageRef, registerCard, handleKeyDown, goTo, focusIndex, downgraded } = useWheelStack({
    count: capped.length,
    onOpen: (i) => { const g = capped[i]; if (g) onOpen?.(g) },
    onExit,
  })

  if (capped.length === 0) return null

  // reduced-motion：横向扁平轨道（等价内容，无 3D、无玻璃、无 rAF）
  if (reduced) return <FlatTrack groups={capped} onOpen={onOpen} ariaLabel={ariaLabel} stageTheme={stageTheme} />

  const focused = capped[Math.min(focusIndex, capped.length - 1)]
  // 尾巴计数与物理内核的渲染窗口共用同一对常量，防两处魔法数各自漂移
  const tailCount = Math.max(0, capped.length - focusIndex - (downgraded ? WINDOW_DOWNGRADED : WINDOW_FULL) - 1)

  const handleCardClick = (i: number) => {
    if (i === focusIndex) { onOpen?.(capped[i]); return }
    goTo(i)
  }

  return (
    <div
      ref={stageRef}
      data-theme={stageTheme}
      className={`fs3d-stage${downgraded ? ' fs3d-noglass' : ''}`}
      tabIndex={0}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={`fs3d-card-${focusIndex}`}
      onKeyDown={handleKeyDown}
    >
      <div className="fs3d-rail">
        {capped.map((g, i) => (
          <StackCard
            key={g.id}
            group={g}
            index={i}
            cardId={`fs3d-card-${i}`}
            selected={i === focusIndex}
            refFn={registerCard(i)}
            onClick={handleCardClick}
          />
        ))}
      </div>

      {/* KPI 玻璃浮层胶囊（真玻璃白名单之二）——只随聚焦索引变化更新 */}
      <div className="fs3d-kpi">
        <h4><span>{focused.name}</span><span className="fs3d-kpi-dot" /></h4>
        {focused.meta && <p>{focused.meta}</p>}
        <div className="fs3d-kpi-big">
          {focused.primaryValue}
          {focused.primaryUnit && <u>{focused.primaryUnit}</u>}
        </div>
      </div>

      {tailCount > 0 && <div className="fs3d-tailbadge">+{tailCount} 更多</div>}

      {/* 右侧详情面板 */}
      {focused.detail && focused.detail.length > 0 && (
        <div className="fs3d-detail">
          <div className="fs3d-detail-k">{focused.primaryLabel || '分组'}</div>
          <h3>{focused.name}</h3>
          <table>
            <tbody>
              {focused.detail.map(row => (
                <tr key={row.label}><td>{row.label}</td><td>{row.value}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** reduced-motion 降级：横向扁平轨道 */
function FlatTrack({ groups, onOpen, ariaLabel, stageTheme }: {
  groups: StackGroup[]
  onOpen?: (group: StackGroup) => void
  ariaLabel: string
  stageTheme: StageTheme
}) {
  const [active, setActive] = useState(0)
  return (
    <div className="fs3d-flat" data-theme={stageTheme} role="listbox" aria-label={ariaLabel}>
      {groups.map((g, i) => (
        <button
          key={g.id}
          type="button"
          role="option"
          aria-selected={i === active}
          className={`fs3d-flat-card${i === active ? ' fs3d-on' : ''}`}
          onClick={() => { if (i === active) onOpen?.(g); else setActive(i) }}
        >
          <div>{g.name}</div>
          <div className="fs3d-num">
            {g.primaryValue}
            {g.primaryUnit && <u>{g.primaryUnit}</u>}
          </div>
        </button>
      ))}
    </div>
  )
}
