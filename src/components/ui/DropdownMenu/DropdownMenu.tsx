import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
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
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, origin: 'top left' })
  const triggerRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const wasOpenRef = useRef(false)

  // Open: auto-focus first enabled menu item
  useEffect(() => {
    if (!isOpen) return
    menuRef.current
      ?.querySelector<HTMLButtonElement>('button:not(:disabled)')
      ?.focus()
  }, [isOpen])

  // Close (Esc / selection / click outside): return focus to the trigger button
  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true
      return
    }
    if (!wasOpenRef.current) return
    wasOpenRef.current = false
    const triggerEl =
      triggerRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ) ?? triggerRef.current
    triggerEl?.focus()
  }, [isOpen])

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

      // Expand from the trigger side: below trigger → top origin, above trigger → bottom origin
      const origin = top >= rect.bottom ? 'top left' : 'bottom left'
      setPosition({ top, left, width: rect.width, origin })
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

  // Close on Escape + ArrowUp/ArrowDown focus navigation among enabled items
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const buttons = menuRef.current?.querySelectorAll<HTMLButtonElement>(
          'button:not(:disabled)',
        )
        if (!buttons || buttons.length === 0) return
        e.preventDefault()
        const list = Array.from(buttons)
        const idx = list.indexOf(document.activeElement as HTMLButtonElement)
        const next =
          idx === -1
            ? e.key === 'ArrowDown'
              ? 0
              : list.length - 1
            : e.key === 'ArrowDown'
              ? (idx + 1) % list.length
              : (idx - 1 + list.length) % list.length
        list[next].focus()
      }
    }
    if (isOpen) document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
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
        const origin = top >= rect.bottom ? 'top left' : 'bottom left'
        setPosition({ top, left, width: rect.width, origin })
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
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[9999] min-w-[160px] rounded-lg shadow-lg overflow-hidden"
            style={{
              top: position.top, left: position.left,
              transformOrigin: position.origin,
              background: 'var(--card)', border: '1px solid var(--border)',
              opacity: 1, transform: 'translateY(0) scale(1)',
              animation: 'dropdown-in 0.15s ease-out',
            }}
          >
            <style>{`@keyframes dropdown-in { from { opacity: 0; transform: translateY(-4px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }`}</style>
            <div className="py-1">
              {items.map((item) => (
                <React.Fragment key={item.key}>
                  {item.divider && <div className="my-1 border-t" style={{ borderColor: 'var(--border)' }} />}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (!item.disabled) {
                        item.onClick?.()
                        setIsOpen(false)
                      }
                    }}
                    disabled={item.disabled}
                    style={{ color: item.danger ? 'var(--danger)' : 'var(--fg)' }}
                    className={`
                      w-full flex items-center gap-2 px-4 py-2 text-sm text-left
                      transition-colors
                      ${item.danger ? 'hover:bg-danger-50' : 'hover:bg-[color:var(--panel-2)]'}
                      ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {item.icon && <Icon name={item.icon} size={16} />}
                    {item.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
