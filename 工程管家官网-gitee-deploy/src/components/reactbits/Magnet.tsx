import { useState, useEffect, useRef, useCallback, type ReactNode, type CSSProperties, type MouseEvent } from 'react'

interface Props {
  children: ReactNode
  padding?: number
  disabled?: boolean
  magnetStrength?: number
  activeTransition?: string
  inactiveTransition?: string
  wrapperClassName?: string
  innerClassName?: string
  style?: CSSProperties
}

export default function Magnet({
  children,
  padding = 60,
  disabled = false,
  magnetStrength = 4,
  activeTransition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
  inactiveTransition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
  wrapperClassName = '',
  innerClassName = '',
  style,
}: Props) {
  const [isActive, setIsActive] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const magnetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (disabled) {
      setPosition({ x: 0, y: 0 })
      return
    }

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!magnetRef.current) return
      const { left, top, width, height } = magnetRef.current.getBoundingClientRect()
      const centerX = left + width / 2
      const centerY = top + height / 2

      const distX = Math.abs(centerX - e.clientX)
      const distY = Math.abs(centerY - e.clientY)

      // 只在按钮自身范围内触发（不再向外扩展 padding）
      if (distX < width / 2 + padding && distY < height / 2 + padding) {
        setIsActive(true)
        // 限制最大位移（避免飞到一边）
        const rawX = (e.clientX - centerX) / magnetStrength
        const rawY = (e.clientY - centerY) / magnetStrength
        const maxOffset = 8
        setPosition({
          x: Math.max(-maxOffset, Math.min(maxOffset, rawX)),
          y: Math.max(-maxOffset, Math.min(maxOffset, rawY)),
        })
      } else {
        setIsActive(false)
        setPosition({ x: 0, y: 0 })
      }
    }

    const node = magnetRef.current
    if (!node) return
    node.addEventListener('mousemove', handleMouseMove)
    node.addEventListener('mouseleave', () => {
      setIsActive(false)
      setPosition({ x: 0, y: 0 })
    })
    return () => {
      node.removeEventListener('mousemove', handleMouseMove)
    }
  }, [padding, disabled, magnetStrength])

  const transitionStyle = isActive ? activeTransition : inactiveTransition

  return (
    <div
      ref={magnetRef}
      className={wrapperClassName}
      style={{ display: 'inline-block', ...style }}
    >
      <div
        className={innerClassName}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          transition: transitionStyle,
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  )
}