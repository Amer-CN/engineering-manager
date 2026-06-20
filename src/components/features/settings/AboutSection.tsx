import { Icon } from '@/components/ui/Icon'

interface AboutSectionProps {
  onShowChangelog: () => void
}

/**
 * v0.76.0 累计待办 #7: Settings 剩余拆分 — 关于卡片
 * 包含: Logo + 名称 + 版本号 (从 window.__APP_VERSION__ 读) + 更新日志按钮
 */
export function AboutSection({ onShowChangelog }: AboutSectionProps) {
  return (
    <div className="card">
      <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="Info" size={20} /> 关于</h2></div>
      <div className="card-body">
        <div className="text-sm text-slate-600 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--panel-2)' }}>
              <svg width="40" height="40" viewBox="0 0 18 18" fill="none">
                <defs>
                  <linearGradient id="about-mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--accent)" />
                    <stop offset="100%" stopColor="var(--violet)" />
                  </linearGradient>
                  <mask id="about-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask>
                </defs>
                <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#about-mark-grad)" strokeLinejoin="round" mask="url(#about-mask)" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">工程管家</p>
              <p className="text-slate-500">
                Version {(window as any).__APP_VERSION__ || '0.75.3'}
                <span className="mx-1.5 text-slate-300">·</span>
                <button onClick={onShowChangelog} className="hover:underline" style={{ color: 'var(--accent)' }}>更新日志</button>
              </p>
            </div>
          </div>
          <p className="text-slate-600">工程项目管理系统 · 本地数据存储</p>
        </div>
      </div>
    </div>
  )
}