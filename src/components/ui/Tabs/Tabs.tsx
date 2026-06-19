import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../Icon'

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
  variant?: 'default' | 'hero'
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
  variant?: 'default' | 'hero'
}) {
  const isHero = variant === 'hero'
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={tab.disabled}
      onClick={onClick}
      className={`
      relative rounded-md font-medium transition-all duration-200
      focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400
      ${tabPadding[size]}
      ${fullWidth ? 'flex-1' : ''}
      ${isHero
        ? isActive
          ? 'text-emerald-300 bg-white/15 rounded-md'
          : 'text-white/50 hover:text-white/80'
        : isActive
          ? 'text-primary-600 bg-white shadow-sm rounded-md'
          : 'text-slate-500 hover:text-slate-700'
      }
      ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span className={`relative z-10 flex items-center justify-center gap-2 ${isActive && isHero ? 'text-emerald-300' : ''}`}>
        {tab.icon && <Icon name={tab.icon} size={14} />}
        {tab.label}
        {tab.badge !== undefined && (
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
            isHero
              ? isActive
                ? 'bg-white/20 text-white'
                : 'bg-white/10 text-white/60'
              : isActive
                ? 'bg-primary-100 text-primary-600'
                : 'bg-slate-200 text-slate-600'
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

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Tab 按钮容器 */}
      <div
        className={`flex items-center gap-1 rounded-xl p-1 w-fit shrink-0 ${
          isHero ? 'bg-white/10' : 'bg-slate-100'
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
                transition={{ duration: 0.15, ease: 'easeOut' }}
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
