import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Calculate position when menu opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const menuWidth = menuRef.current?.offsetWidth || 160

      let top: number
      if (side === 'bottom') {
        top = rect.bottom + sideOffset
      } else {
        top = rect.top - sideOffset - (menuRef.current?.offsetHeight || 0)
      }

      let left: number
      if (align === 'start') {
        left = rect.left
      } else {
        left = rect.right - menuWidth
      }

      // Clamp to viewport
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (left + menuWidth > vw - 8) left = vw - menuWidth - 8
      if (left < 8) left = 8
      if (top < 8) top = rect.bottom + sideOffset
      if (top + (menuRef.current?.offsetHeight || 0) > vh - 8) {
        top = rect.top - sideOffset - (menuRef.current?.offsetHeight || 0)
      }

      setPosition({ top, left, width: rect.width })
    }
  }, [isOpen, side, align, sideOffset])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Update position on scroll/resize
  useEffect(() => {
    if (!isOpen) return
    const handleUpdate = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const menuWidth = menuRef.current?.offsetWidth || 160
        let top = side === 'bottom' ? rect.bottom + sideOffset : rect.top - sideOffset
        let left = align === 'start' ? rect.left : rect.right - menuWidth
        setPosition({ top, left, width: rect.width })
      }
    }
    window.addEventListener('scroll', handleUpdate, true)
    window.addEventListener('resize', handleUpdate)
    return () => {
      window.removeEventListener('scroll', handleUpdate, true)
      window.removeEventListener('resize', handleUpdate)
    }
  }, [isOpen, side, align, sideOffset])

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={menuRef}
              role="menu"
              className="fixed z-[9999] min-w-[160px] bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
              style={{ top: position.top, left: position.left }}
              initial={{ opacity: 0, y: -4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
            >
              <div className="py-1">
                {items.map((item) => (
                  <React.Fragment key={item.key}>
                    {item.divider && <div className="my-1 border-t border-slate-100 dark:border-slate-700" />}
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
                        w-full flex items-center gap-2 px-4 py-2 text-sm text-left
                        transition-colors
                        ${item.danger ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'}
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
          </AnimatePresence>,
          document.body,
        )}
    </div>
  )
}
