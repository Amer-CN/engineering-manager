/**
 * useSlidePill — 滑动高亮胶囊 hook（动效升级批 1）
 *
 * 抽取自 Sidebar.tsx 的滑动胶囊实现（useLayoutEffect 量 hovered/active 项位置，
 * 绝对定位 pill 以 220ms cubic-bezier(0.23,1,0.32,1) 滑动）。
 * 同时测量纵轴（top/height）与横轴（left/width）——纵向列表（Sidebar/SettingsNav）
 * 只依赖纵轴；横向分段切换器（视图切换/筛选组）依赖横轴。
 * hover 项优先：hover 时胶囊滑向 hover 项，离开后回到 active 项。
 * prefers-reduced-motion 由 index.css 全局规则自动承接，无需特判。
 *
 * 用法（容器需 relative；胶囊层由本 hook 的 pillStyle 驱动）：
 *   const pill = useSlidePill(activeKey)
 *   <nav className="relative" ref={pill.containerRef}>
 *     <span aria-hidden style={pill.pillStyle} className="pointer-events-none absolute rounded-[7px]"
 *       // 纵向列表容器可叠 inset-x-0；横向切换器直接用 pillStyle 的 left/width
 *     />
 *     {items.map(it => (
 *       <button key={it.id} ref={pill.registerItem(it.id)}
 *         onMouseEnter={() => pill.setHovered(it.id)}
 *         onMouseLeave={() => pill.setHovered(null)}
 *         onClick={() => setActive(it.id)}>{it.label}</button>
 *     ))}
 *   </nav>
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react'

export interface UseSlidePillResult {
  /** 容器 ref（量相对坐标的基准，调用方挂在 relative 容器上） */
  containerRef: React.RefObject<HTMLDivElement>
  /** 注册某项的 DOM（ref 回调） */
  registerItem: (key: string) => (el: HTMLButtonElement | null) => void
  /** 胶囊层的内联样式（top/left/width/height/透明度/过渡；量不到时 opacity 0） */
  pillStyle: React.CSSProperties
  /** hover 某项（null = 离开，回落 active） */
  setHovered: (key: string | null) => void
  hovered: string | null
}

const PILL_TRANSITION =
  'top 220ms cubic-bezier(0.23,1,0.32,1), height 220ms cubic-bezier(0.23,1,0.32,1), ' +
  'left 220ms cubic-bezier(0.23,1,0.32,1), width 220ms cubic-bezier(0.23,1,0.32,1), opacity 150ms ease'

export function useSlidePill(activeKey: string): UseSlidePillResult {
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [hovered, setHovered] = useState<string | null>(null)
  const [box, setBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  const registerItem = useCallback(
    (key: string) => (el: HTMLButtonElement | null) => { itemRefs.current[key] = el },
    [],
  )

  useLayoutEffect(() => {
    const container = containerRef.current
    const target = itemRefs.current[hovered ?? activeKey]
    if (!container || !target) {
      setBox(null)
      return
    }
    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const next = {
      top: targetRect.top - containerRect.top,
      left: targetRect.left - containerRect.left,
      width: targetRect.width,
      height: targetRect.height,
    }
    // 同值不重设，避免每次渲染重放过渡
    setBox((current) =>
      current && current.top === next.top && current.left === next.left &&
      current.width === next.width && current.height === next.height
        ? current : next,
    )
  }, [hovered, activeKey])

  const pillStyle: React.CSSProperties = {
    top: box?.top ?? 0,
    left: box?.left ?? 0,
    width: box?.width ?? 0,
    height: box?.height ?? 0,
    opacity: box ? 1 : 0,
    transition: PILL_TRANSITION,
  }

  return { containerRef, registerItem, pillStyle, setHovered, hovered }
}
