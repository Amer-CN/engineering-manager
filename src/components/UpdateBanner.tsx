import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useUpdater } from '../hooks/useUpdater'

function formatBytes(b: number): string {
  if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB'
  return (b / 1024 / 1024).toFixed(1) + ' MB'
}

function formatSpeed(bps: number): string {
  if (bps < 1024) return bps.toFixed(0) + ' B/s'
  if (bps < 1024 * 1024) return (bps / 1024).toFixed(0) + ' KB/s'
  return (bps / 1024 / 1024).toFixed(1) + ' MB/s'
}

export function UpdateBanner() {
  const { info, progress, phase, error, check, download, cancel, pause, resume, retry, setInfo } = useUpdater()
  // 记住已忽略的版本号：同一版本忽略后不再弹，之后发布更新的版本时重新提示
  const [dismissedFor, setDismissedFor] = useState<string | null>(null)
  const phaseRef = useRef(phase)
  phaseRef.current = phase

  useEffect(() => {
    check().then(r => { if (!r) setInfo(null) }).catch(() => {})
    // 运行中每 12 小时复查一次新版本；下载/校验/暂停/完成期间跳过，避免打断更新流程
    const timer = setInterval(() => {
      const p = phaseRef.current
      if (p === 'checking' || p === 'downloading' || p === 'verifying' || p === 'paused' || p === 'done') return
      check().then(r => { if (!r) setInfo(null) }).catch(() => {})
    }, 12 * 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  if (!info?.hasUpdate) return null

  // 强更：全屏遮罩（不可关闭）
  if (info.forced) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
        <div className="bg-[color:var(--card)] rounded-xl shadow-xl px-8 py-10 max-w-sm w-full mx-4 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-lg font-semibold text-[color:var(--fg)] mb-2">发现新版本</h2>
          <p className="text-sm text-[color:var(--fg-2)] mb-1">
            <strong className="text-[color:var(--fg)]">{info.latest}</strong>（当前 {info.current}）
          </p>
          <p className="text-sm text-danger-600 font-medium mb-4">此版本需强制更新</p>

          {renderProgress(progress, phase, pause, cancel)}

          {(!progress || phase === 'idle') && (
            <button
              onClick={download}
              disabled={phase === 'downloading'}
              className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                phase === 'downloading' ? 'bg-[color:var(--panel-2)] text-[color:var(--muted)] cursor-not-allowed' : 'bg-danger-600 text-white hover:bg-danger-700'
              }`}
            >
              {phase === 'downloading' ? '准备中...' : '立即更新'}
            </button>
          )}

          {phase === 'done' && <p className="text-sm text-success-600 font-medium mt-3">更新完成，正在重启...</p>}

          {phase === 'paused' && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <p className="text-xs text-[color:var(--muted)]">下载已暂停</p>
              <button onClick={resume} className="px-4 py-1.5 rounded text-xs font-medium bg-danger-600 text-white hover:bg-danger-700">继续下载</button>
              <button onClick={cancel} className="px-4 py-1.5 rounded text-xs font-medium bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)]">取消</button>
            </div>
          )}

          {phase === 'cancelled' && (
            <div className="mt-3">
              <p className="text-xs text-[color:var(--muted)] mb-2">下载已取消</p>
              <button onClick={retry} className="px-4 py-1.5 rounded text-xs font-medium bg-danger-600 text-white hover:bg-danger-700">重新下载</button>
            </div>
          )}

          {phase === 'error' && (
            <div className="mt-3">
              <p className="text-xs text-danger-600 mb-2">{error || '下载出错'}</p>
              <button onClick={retry} className="px-4 py-1.5 rounded text-xs font-medium bg-danger-600 text-white hover:bg-danger-700">重试</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 非强更：悬浮固定通知条（不挤压布局，可关闭）
  if (dismissedFor === info.latest) return null

  const isDownloading = phase === 'downloading' || phase === 'verifying'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed top-2 left-0 right-0 z-[300] flex justify-center pointer-events-none px-4"
      >
        <div className="bg-warning-50 border border-warning-200 shadow-lg rounded-lg px-4 py-2.5 text-sm pointer-events-auto max-w-2xl w-full">
          <div className="flex items-center gap-2">
            <span className="text-warning-800 flex-1">
              🚀 发现新版本 <strong>{info.latest}</strong>（当前 {info.current}）
            </span>

            {!progress && !isDownloading && phase !== 'done' && phase !== 'cancelled' && (
              <button
                onClick={download}
                className="px-3 py-1 rounded text-xs font-medium bg-[color:var(--accent)] text-[color:var(--on-accent)] hover:opacity-90 flex-shrink-0"
              >
                立即更新
              </button>
            )}

            {phase === 'downloading' && (
              <button
                onClick={pause}
                className="px-3 py-1 rounded text-xs font-medium bg-[color:var(--panel-2)] text-[color:var(--fg-2)] hover:bg-[color:var(--panel-2)] flex-shrink-0"
              >
                暂停
              </button>
            )}

            {phase === 'paused' && (
              <button
                onClick={resume}
                className="px-3 py-1 rounded text-xs font-medium bg-[color:var(--accent)] text-[color:var(--on-accent)] hover:opacity-90 flex-shrink-0"
              >
                继续下载
              </button>
            )}

            {phase === 'done' && <span className="text-xs text-success-600 flex-shrink-0">更新完成，正在重启...</span>}
            {phase === 'cancelled' && (
              <button
                onClick={retry}
                className="px-3 py-1 rounded text-xs font-medium bg-[color:var(--accent)] text-[color:var(--on-accent)] hover:opacity-90 flex-shrink-0"
              >
                重新下载
              </button>
            )}

            {phase !== 'downloading' && phase !== 'verifying' && (
              <button
                onClick={() => setDismissedFor(info.latest)}
                className="text-warning-400 hover:text-warning-600 text-lg leading-none flex-shrink-0 ml-1"
                title="稍后再说"
              >
                &times;
              </button>
            )}
          </div>

          {isDownloading && renderProgress(progress, phase, pause, cancel)}

          {phase === 'paused' && progress && (
            <div className="mt-2">
              <div className="w-full bg-[color:var(--panel-2)] rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-warning-400"
                  style={{ width: `${Math.min(progress.percent ?? 0, 100)}%` }}
                />
              </div>
              <div className="text-xs text-[color:var(--muted)] mt-1 flex justify-between items-center">
                <span>已暂停 · {formatBytes(progress.bytesReceived)}{progress.totalBytes ? ` / ${formatBytes(progress.totalBytes)}` : ''}</span>
                <span className="flex items-center gap-2">
                  {progress.percent != null ? `${progress.percent}%` : ''}
                  <button
                    onClick={cancel}
                    className="text-[color:var(--muted)] hover:text-danger-500 transition-colors"
                    title="取消下载"
                  >
                    ✕
                  </button>
                </span>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-danger-600 flex-1">{error || '下载出错'}</span>
              <button onClick={retry} className="px-2 py-0.5 rounded text-xs font-medium bg-danger-600 text-white hover:bg-danger-700 flex-shrink-0">重试</button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function renderProgress(progress: any, phase: string, pause?: () => void, cancel?: () => void) {
  if (!progress || phase === 'idle') return null
  const pct = progress.percent
  const indeterminate = pct == null && phase === 'downloading'

  return (
    <div className="w-full mt-2">
      {phase === 'verifying' ? (
        <div className="text-xs text-[color:var(--muted)]">正在校验...</div>
      ) : (
        <>
          <div className="w-full bg-[color:var(--panel-2)] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-300 ${indeterminate ? 'w-1/3 bg-[color:var(--accent)] animate-pulse' : 'bg-[color:var(--accent)]'}`}
              style={indeterminate ? {} : { width: `${Math.min(pct ?? 0, 100)}%` }}
            />
          </div>
          <div className="text-xs text-[color:var(--muted)] mt-1 flex justify-between items-center">
            <span>
              {formatBytes(progress.bytesReceived)}
              {progress.totalBytes ? ` / ${formatBytes(progress.totalBytes)}` : ''}
            </span>
            <span className="flex items-center gap-2">
              {pct != null ? `${pct}%` : indeterminate ? '下载中...' : ''}
              {progress.speedBytesPerSec ? ` · ${formatSpeed(progress.speedBytesPerSec)}` : ''}
              {pause && phase === 'downloading' && (
                <button
                  onClick={pause}
                  className="text-[color:var(--muted)] hover:text-warning-500 transition-colors ml-1"
                  title="暂停下载"
                >
                  ❚❚
                </button>
              )}
              {cancel && phase === 'downloading' && (
                <button
                  onClick={cancel}
                  className="text-[color:var(--muted)] hover:text-danger-500 transition-colors ml-1"
                  title="取消下载"
                >
                  ✕
                </button>
              )}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
