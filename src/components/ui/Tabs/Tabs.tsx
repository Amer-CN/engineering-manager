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
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
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
}: {
  tab: TabItem
  isActive: boolean
  onClick: () => void
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}) {
  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={tab.disabled}
      onClick={onClick}
      className={`
        relative rounded-md font-medium transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
        ${tabPadding[size]}
        ${fullWidth ? 'flex-1' : ''}
        ${isActive
          ? 'text-primary-600 shadow-sm'
          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
        }
        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {isActive && (
        <motion.div
          layoutId="active-tab"
          className="absolute inset-0 bg-white dark:bg-slate-800 rounded-md shadow-sm"
          transition={{ type: 'spring', stiffness: 40, damping: 25 }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {tab.icon && <Icon name={tab.icon} size={14} />}
        {tab.label}
        {tab.badge !== undefined && (
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
            isActive
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
  size = 'md',
  fullWidth = false,
}: TabsProps) {
  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {/* Tab 按钮容器 */}
      <div
        className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 w-fit"
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
          />
        ))}
      </div>

      {/* 内容区域 */}
      {children && (
        <div className="mt-4">
          {animated ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={value}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
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
