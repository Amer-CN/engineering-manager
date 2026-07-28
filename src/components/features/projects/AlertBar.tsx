import { Icon } from '../../ui/Icon'

interface AlertItem {
  projectName: string
  message: string
  level: 'danger' | 'warning' | 'info'
}

const levelConfig = {
  danger: { dot: 'bg-danger-500', bg: 'bg-danger-50 border-danger-100', text: 'text-danger-700' },
  warning: { dot: 'bg-warning-500', bg: 'bg-warning-50 border-warning-100', text: 'text-warning-700' },
  info: { dot: 'bg-[color:var(--muted)]', bg: 'bg-[color:var(--panel-2)] border-[color:var(--border)]', text: 'text-[color:var(--fg-2)]' },
}

interface AlertBarProps {
  alerts: AlertItem[]
  onViewAll?: () => void
}

export function AlertBar({ alerts, onViewAll }: AlertBarProps) {
  if (alerts.length === 0) return null

  return (
    <div className="bg-warning-50 border border-warning-200 rounded-xl p-3.5 mb-6 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-warning-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon name="AlertTriangle" size={14} className="text-warning-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-warning-800 text-sm mb-1">{alerts.length} 个项目需要关注</p>
        <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-sm text-[color:var(--fg-2)]">
          {alerts.map((a, i) => {
            const cfg = levelConfig[a.level]
            return (
              <span key={i} className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <strong>{a.projectName}</strong> — {a.message}
              </span>
            )
          })}
        </div>
      </div>
      {onViewAll && (
        <button onClick={onViewAll} className="text-xs font-medium text-warning-700 bg-warning-100 hover:bg-warning-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
          全部
        </button>
      )}
    </div>
  )
}

export type { AlertItem }
