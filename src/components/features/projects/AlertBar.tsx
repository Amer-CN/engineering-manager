import { Icon } from '../../ui/Icon'

interface AlertItem {
  projectName: string
  message: string
  level: 'danger' | 'warning' | 'info'
}

const levelConfig = {
  danger: { dot: 'bg-red-500', bg: 'bg-red-50 border-red-100', text: 'text-red-700' },
  warning: { dot: 'bg-amber-500', bg: 'bg-amber-50 border-amber-100', text: 'text-amber-700' },
  info: { dot: 'bg-blue-500', bg: 'bg-blue-50 border-blue-100', text: 'text-blue-700' },
}

interface AlertBarProps {
  alerts: AlertItem[]
  onViewAll?: () => void
}

export function AlertBar({ alerts, onViewAll }: AlertBarProps) {
  if (alerts.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-6 flex items-start gap-3">
      <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon name="AlertTriangle" size={14} className="text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-amber-800 text-sm mb-1">{alerts.length} 个项目需要关注</p>
        <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-sm text-slate-600">
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
        <button onClick={onViewAll} className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
          全部
        </button>
      )}
    </div>
  )
}

export type { AlertItem }
