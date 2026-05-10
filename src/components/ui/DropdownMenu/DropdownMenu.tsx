import React, { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '../Icon'

export interface DropdownMenuItem {
  key: string
  label: string
  icon?: string
  danger?: boolean
  disabled?: boolean
  divider?: boolean
  onClick?: () => void
}

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: 'start' | 'end'
  side?: 'bottom' | 'top'
  sideOffset?: number
}

export function DropdownMenu({
  trigger,
  items,
  align = 'start',
  side = 'bottom',
  sideOffset = 4,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const positionClasses = {
    bottom: 'top-full mt-1',
    top: 'bottom-full mb-1',
  }

  const alignClasses = {
    start: 'left-0',
    end: 'right-0',
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`absolute z-50 min-w-[160px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden ${positionClasses[side]} ${alignClasses[align]}`}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            <div className="py-1">
              {items.map((item) => (
                <React.Fragment key={item.key}>
                  {item.divider && <div className="my-1 border-t border-slate-100" />}
                  <button
                    type="button"
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick?.()
                        setIsOpen(false)
                      }
                    }}
                    disabled={item.disabled}
                    className={`
                      w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left
                      transition-colors
                      ${item.danger ? 'text-red-600 hover:bg-red-50:bg-red-900/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50:bg-slate-700'}
                      ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {item.icon && <Icon name={item.icon} size={16} />}
                    {item.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
