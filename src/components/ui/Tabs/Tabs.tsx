
export interface TabsProps {
  value: string
  onChange: (value: string) => void
  tabs: { key: string; label: string; icon?: string; badge?: number | string }[]
  className?: string
}

export function Tabs({ value, onChange, tabs, className = '' }: TabsProps) {
  return (
    <div className={`flex items-center gap-1 p-1 bg-slate-100 rounded-xl ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = value === tab.key
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`
              relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${isActive
                ? 'bg-white dark:bg-slate-800 text-primary-600 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700:text-slate-300'
              }
            `}
          >
            <span className="flex items-center gap-2">
              {tab.label}
              {tab.badge !== undefined && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-primary-100 text-primary-600' : 'bg-slate-200 text-slate-600'}`}>
                  {tab.badge}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
