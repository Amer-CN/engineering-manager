import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useUpdater } from '@/hooks/useUpdater'
import { APP_VERSION } from '@/version'

interface AboutSectionProps {
  onShowChangelog: () => void
}

/**
 * 关于卡片：Logo + 版本号 + 检查更新 + 更新日志
 */
export function AboutSection({ onShowChangelog }: AboutSectionProps) {
  const { info, phase, error, check, download } = useUpdater()
  const [checked, setChecked] = useState(false)

  const handleCheck = async () => {
    await check()
    setChecked(true)
  }

  const renderUpdateStatus = () => {
    if (phase === 'checking') return <span className="text-blue-500 text-xs">检查中...</span>
    if (phase === 'no-update' && checked) return <span className="text-green-600 text-xs">已是最新版本</span>
    if (phase === 'error') return <span className="text-red-500 text-xs">{error}</span>
    if (info?.hasUpdate) {
      if (phase === 'downloading' || phase === 'verifying') {
        return <span className="text-blue-500 text-xs">下载中...</span>
      }
      if (phase === 'done') {
        return <span className="text-green-600 text-xs">更新完成，正在重启...</span>
      }
      return (
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-xs">发现新版本 {info.latest}</span>
          <button
            onClick={download}
            className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            立即更新
          </button>
        </div>
      )
    }
    return null
  }

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
                Version {APP_VERSION}
                <span className="mx-1.5 text-slate-300">·</span>
                <button onClick={onShowChangelog} className="hover:underline" style={{ color: 'var(--accent)' }}>更新日志</button>
              </p>
            </div>
          </div>
          <p className="text-slate-600">工程项目管理系统 · 本地数据存储</p>

          {/* 软件更新 */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="Download" size={14} />
              <span className="text-xs font-medium text-slate-700">软件更新</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheck}
                disabled={phase === 'checking' || phase === 'downloading' || phase === 'verifying'}
                className="text-xs px-3 py-1 rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === 'checking' ? '检查中...' : '检查更新'}
              </button>
              {checked && phase === 'error' && (
                <button onClick={handleCheck} className="text-xs text-blue-600 hover:underline">重试</button>
              )}
            </div>
            <div className="mt-1">{renderUpdateStatus()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
