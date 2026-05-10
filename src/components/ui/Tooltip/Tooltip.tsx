import React, { useState } from 'react'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  delay?: number
  className?: string
}

export function Tooltip({ content, children, delay = 300, className = '' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  const handleMouseEnter = () => {
    timer = setTimeout(() => setVisible(true), delay)
  }

  const handleMouseLeave = () => {
    if (timer) clearTimeout(timer)
    setVisible(false)
  }

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 text-xs text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 -mt-1 rotate-45 bg-slate-800" />
        </div>
      )}
    </div>
  )
}
