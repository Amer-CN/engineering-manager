import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  position?: TooltipPosition
  delay?: number
  className?: string
  maxWidth?: number
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  className = '',
  maxWidth = 240,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  // Calculate position
  useEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const tip = tooltipRef.current
      const gap = 8

      let top = 0
      let left = 0

      switch (position) {
        case 'top':
          top = rect.top - tip.offsetHeight - gap
          left = rect.left + rect.width / 2 - tip.offsetWidth / 2
          break
        case 'bottom':
          top = rect.bottom + gap
          left = rect.left + rect.width / 2 - tip.offsetWidth / 2
          break
        case 'left':
          top = rect.top + rect.height / 2 - tip.offsetHeight / 2
          left = rect.left - tip.offsetWidth - gap
          break
        case 'right':
          top = rect.top + rect.height / 2 - tip.offsetHeight / 2
          left = rect.right + gap
          break
      }

      // Clamp to viewport
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (left < 8) left = 8
      if (left + tip.offsetWidth > vw - 8) left = vw - tip.offsetWidth - 8
      if (top < 8) top = 8
      if (top + tip.offsetHeight > vh - 8) top = vh - tip.offsetHeight - 8

      setTooltipPos({ top, left })
    }
  }, [visible, position])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const arrowClass = {
    top: 'absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 -mt-1 rotate-45 bg-slate-800 dark:bg-slate-700',
    bottom: 'absolute bottom-full left-1/2 -translate-x-1/2 w-2 h-2 -mb-1 rotate-45 bg-slate-800 dark:bg-slate-700',
    left: 'absolute left-full top-1/2 -translate-y-1/2 w-2 h-2 -ml-1 rotate-45 bg-slate-800 dark:bg-slate-700',
    right: 'absolute right-full top-1/2 -translate-y-1/2 w-2 h-2 -mr-1 rotate-45 bg-slate-800 dark:bg-slate-700',
  }[position]

  return (
    <div
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {typeof window !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {visible && (
              <motion.div
                ref={tooltipRef}
                role="tooltip"
                className="fixed z-[9999] px-2 py-1 text-xs text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-normal pointer-events-none"
                style={{ top: tooltipPos.top, left: tooltipPos.left, maxWidth }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {content}
                <div className={arrowClass} />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}
