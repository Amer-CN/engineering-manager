import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../Icon'
import { EASE_OUT } from '../../../constants/animations'

export interface TabItem {
  key: string
  label: string
  icon?: string
  badge?: number | string
  disabled?: boolean
}

export interface TabsProps {
  value: string
  onChange: (value: string) => void
  tabs: TabItem[]
  children?: ReactNode
  animated?: boolean
  className?: string
  contentClassName?: string
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  variant?: 'default' | 'hero' | 'segmented'
}

const tabPadding: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
}

function TabsTrigger({
  tab,
  isActive,
  onClick,
  size = 'md',
  fullWidth = false,
  variant = 'default',
}: {
  tab: TabItem
  isActive: boolean
  onClick: () => void
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  variant?: 'default' | 'hero' | 'segmented'
}) {
  const isHero = variant === 'hero'
  const isSegmented = variant === 'segmented'
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={tab.disabled}
      onClick={onClick}
      className={`
      relative ${isHero ? 'rounded-md' : ''} ${isSegmented ? 'rounded-[7px]' : ''} font-medium transition-[color,background-color,border-color,box-shadow] duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]
      ${tabPadding[size]}
      ${fullWidth ? 'flex-1' : ''}
      ${isHero
        ? isActive
          ? 'text-success-300 bg-[color:var(--card)]/15 rounded-md'
          : 'text-white/50 hover:text-white/80'
        : isSegmented
          ? isActive
            ? 'text-[color:var(--fg)] bg-[color:var(--card)] border border-[color:var(--border)] shadow-[0_1px_2px_rgba(0,0,0,0.05)]'
            : 'text-[color:var(--muted)] hover:text-[color:var(--fg-2)] border border-transparent'
          : isActive
            ? 'text-[color:var(--fg)] border-b-2 border-[color:var(--accent)] -mb-px'
            : 'text-[color:var(--muted)] hover:text-[color:var(--fg-2)]'
      }
      ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className={`relative z-10 flex items-center justify-center gap-2 ${isActive && isHero ? 'text-success-300' : ''}`}>
        {tab.icon && <Icon name={tab.icon} size={14} />}
        {tab.label}
        {tab.badge !== undefined && (
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
            isHero
              ? isActive
                ? 'bg-[color:var(--card)]/20 text-white'
                : 'bg-[color:var(--card)]/10 text-white/60'
              : isActive
                ? 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
                : 'bg-[color:var(--panel-2)] text-[color:var(--fg-2)]'
          }`}>
            {tab.badge}
          </span>
        )}
      </span>
    </button>
  )
}

export function Tabs({
  value,
  onChange,
  tabs,
  children,
  animated = true,
  className = '',
  contentClassName = '',
  size = 'md',
  fullWidth = false,
  variant = 'default',
}: TabsProps) {
  const hasFlexLayout = contentClassName?.includes('flex')
  const isHero = variant === 'hero'
  const isSegmented = variant === 'segmented'

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Tab 按钮容器 — Stitch: underline / segmented tabs */}
      <div
        className={`flex items-center shrink-0 ${
          isHero ? 'gap-1 rounded-xl p-1 bg-[color:var(--card)]/10'
          : isSegmented ? 'gap-1 inline-flex p-1 rounded-[11px] border border-[color:var(--border)] bg-[color:var(--panel-2)]'
          : 'gap-6 border-b border-[color:var(--border)] pb-0'
        }`}
        role="tablist"
        aria-orientation="horizontal"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            tab={tab}
            isActive={value === tab.key}
            onClick={() => !tab.disabled && onChange(tab.key)}
            size={size}
            fullWidth={fullWidth}
            variant={variant}
          />
        ))}
      </div>

      {/* 内容区域 */}
      {children && (
        <div className={`mt-4 flex-1 min-h-0 ${contentClassName}`}>
          {animated ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={value}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15, ease: EASE_OUT }}
                className={hasFlexLayout ? 'flex-1 flex flex-col min-h-0' : ''}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  )
}
