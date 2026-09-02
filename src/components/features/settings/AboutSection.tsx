import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useUpdater } from '@/hooks/useUpdater'
import { APP_VERSION } from '@/version'

interface AboutSectionProps {
  onShowChangelog: () => void
}

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

function formatSpeed(bps: number): string {
  if (bps < 1024) return bps.toFixed(0) + ' B/s'
  if (bps < 1024 * 1024) return (bps / 1024).toFixed(0) + ' KB/s'
  return (bps / 1024 / 1024).toFixed(1) + ' MB/s'
}

/**
 * 关于卡片：Logo + 版本号 + 检查更新 + 更新日志
 */
export function AboutSection({ onShowChangelog }: AboutSectionProps) {
  const { info, progress, phase, error, check, download, cancel, pause, resume, retry } = useUpdater()
  const [checked, setChecked] = useState(false)

  const handleCheck = async () => {
    await check()
    setChecked(true)
  }

  const isDownloading = phase === 'downloading' || phase === 'verifying'

  const renderProgressBar = () => {
    if (!progress || phase === 'idle') return null
    const pct = progress.percent
    const indeterminate = pct == null && phase === 'downloading'

    if (phase === 'verifying') {
      return <div className="text-xs text-[color:var(--muted)] mt-1">正在校验...</div>
    }

    return (
      <div className="mt-2 w-full">
        <div className="w-full bg-[color:var(--panel-2)] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ${indeterminate ? 'w-1/3 bg-[color:var(--accent)] animate-pulse' : phase === 'paused' ? 'bg-warning-400' : 'bg-[color:var(--accent)]'}`}
            style={indeterminate ? {} : { width: `${Math.min(pct ?? 0, 100)}%` }}
          />
        </div>
        <div className="text-xs text-[color:var(--muted)] mt-1 flex justify-between items-center">
          <span>
            {phase === 'paused' ? '已暂停 · ' : ''}
            {formatBytes(progress.bytesReceived)}
            {progress.totalBytes ? ` / ${formatBytes(progress.totalBytes)}` : ''}
          </span>
          <span className="flex items-center gap-2">
            {pct != null ? `${pct}%` : indeterminate ? '下载中...' : ''}
            {progress.speedBytesPerSec ? ` · ${formatSpeed(progress.speedBytesPerSec)}` : ''}
            {phase === 'downloading' && (
              <>
                <button
                  onClick={pause}
                  className="text-[color:var(--muted)] hover:text-warning-500 transition-colors ml-1"
                  title="暂停下载"
                >
                  ❚❚
                </button>
                <button
                  onClick={cancel}
                  className="text-[color:var(--muted)] hover:text-danger-500 transition-colors ml-1"
                  title="取消下载"
                >
                  ✕
                </button>
              </>
            )}
          </span>
        </div>
        {phase === 'paused' && (
          <div className="flex items-center gap-2 mt-1.5">
            <button
              onClick={resume}
              className="text-xs px-2 py-0.5 rounded bg-[color:var(--accent)] text-white hover:opacity-90"
            >
              继续下载
            </button>
            <button
              onClick={cancel}
              className="text-xs px-2 py-0.5 rounded bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]"
            >
              取消
            </button>
          </div>
        )}
      </div>
    )
  }

  const renderUpdateStatus = () => {
    if (phase === 'checking') return <span className="text-[color:var(--accent)] text-xs">检查中...</span>
    if (phase === 'no-update' && checked) return <span className="text-success-600 text-xs">已是最新版本</span>
    if (phase === 'error') return <span className="text-danger-500 text-xs">{error}</span>
    if (info?.hasUpdate) {
      if (isDownloading) {
        return <span className="text-[color:var(--accent)] text-xs">下载中...</span>
      }
      if (phase === 'paused') {
        return <span className="text-warning-600 text-xs">下载已暂停</span>
      }
      if (phase === 'done') {
        return <span className="text-success-600 text-xs">更新完成，正在重启...</span>
      }
      if (phase === 'cancelled') {
        return (
          <div className="flex items-center gap-2">
            <span className="text-[color:var(--muted)] text-xs">下载已取消</span>
            <button onClick={retry} className="text-xs px-2 py-0.5 rounded bg-[color:var(--accent)] text-white hover:opacity-90">重新下载</button>
          </div>
        )
      }
      return (
        <div className="flex items-center gap-2">
          <span className="text-warning-600 text-xs">发现新版本 {info.latest}</span>
          <button
            onClick={download}
            className="text-xs px-2 py-0.5 rounded bg-[color:var(--accent)] text-white hover:opacity-90"
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
      <div className="card-header"><h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Info" size={20} /> 关于</h2></div>
      <div className="card-body">
        <div className="text-sm text-[color:var(--fg-2)] space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg bg-secondary">
              <svg width="40" height="40" viewBox="0 0 18 18" fill="none">
                <defs><mask id="about-mask"><rect width="18" height="18" fill="white" /><path d="M5 14 L9 6 L13 14 Z" fill="black" /></mask></defs>
                <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="var(--brand)" strokeLinejoin="round" mask="url(#about-mask)" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-[color:var(--fg)]">工程管家</p>
              <p className="text-[color:var(--muted)]">
                Version {APP_VERSION}
                <span className="mx-1.5 text-[color:var(--border-strong)]">·</span>
                <button onClick={onShowChangelog} className="hover:underline text-primary">更新日志</button>
              </p>
            </div>
          </div>
          <p className="text-[color:var(--fg-2)]">工程项目管理系统 · 本地数据存储</p>

          {/* 软件更新 */}
          <div className="pt-2 border-t border-[color:var(--border)]">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="Download" size={14} />
              <span className="text-xs font-medium text-[color:var(--fg-2)]">软件更新</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCheck}
                disabled={phase === 'checking' || isDownloading}
                className="text-xs px-3 py-1 rounded border border-[color:var(--border)] hover:bg-[color:var(--panel-2)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === 'checking' ? '检查中...' : '检查更新'}
              </button>
              {checked && phase === 'error' && (
                <button onClick={handleCheck} className="text-xs text-[color:var(--accent)] hover:underline">重试</button>
              )}
            </div>
            <div className="mt-1">{renderUpdateStatus()}</div>
            {renderProgressBar()}
          </div>
        </div>
      </div>
    </div>
  )
}
