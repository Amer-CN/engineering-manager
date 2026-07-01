import { useEffect } from 'react'
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
  const { info, progress, phase, error, check, download, retry, setInfo } = useUpdater()

  useEffect(() => {
    check().then(r => { if (!r) setInfo(null) }).catch(() => {})
  }, [])

  if (!info?.hasUpdate) return null

  const renderProgress = () => {
    if (!progress || phase === 'idle') return null
    const pct = progress.percent
    const indeterminate = pct == null && phase === 'downloading'

    return (
      <div className="w-full mt-2">
        {phase === 'verifying' ? (
          <div className="text-xs text-gray-500">正在校验...</div>
        ) : (
          <>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${indeterminate ? 'w-1/3 bg-blue-400 animate-pulse' : 'bg-blue-500'}`}
                style={indeterminate ? {} : { width: `${Math.min(pct ?? 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1 flex justify-between">
              <span>
                {formatBytes(progress.bytesReceived)}
                {progress.totalBytes ? ` / ${formatBytes(progress.totalBytes)}` : ''}
              </span>
              <span>
                {pct != null ? `${pct}%` : indeterminate ? '下载中...' : ''}
                {progress.speedBytesPerSec ? ` · ${formatSpeed(progress.speedBytesPerSec)}` : ''}
              </span>
            </div>
          </>
        )}
      </div>
    )
  }

  // 强更：全屏遮罩
  if (info.forced) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl px-8 py-10 max-w-sm w-full mx-4 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">发现新版本</h2>
          <p className="text-sm text-gray-600 mb-1">
            <strong className="text-gray-900">{info.latest}</strong>（当前 {info.current}）
          </p>
          <p className="text-sm text-red-600 font-medium mb-4">此版本需强制更新</p>

          {renderProgress()}

          {(!progress || phase === 'idle') && (
            <button
              onClick={download}
              disabled={phase === 'downloading'}
              className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                phase === 'downloading' ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {phase === 'downloading' ? '准备中...' : '立即更新'}
            </button>
          )}

          {phase === 'done' && <p className="text-sm text-green-600 font-medium mt-3">更新完成，正在重启...</p>}

          {phase === 'error' && (
            <div className="mt-3">
              <p className="text-xs text-red-600 mb-2">{error || '下载出错'}</p>
              <button onClick={retry} className="px-4 py-1.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700">重试</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 非强更：行内 banner
  const isDownloading = phase === 'downloading' || phase === 'verifying'

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-amber-800">
          🚀 发现新版本 <strong>{info.latest}</strong>（当前 {info.current}）
        </span>

        {!progress && (
          <button
            onClick={download}
            disabled={phase === 'downloading'}
            className="ml-auto px-3 py-1 rounded text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {phase === 'downloading' ? '准备中...' : '立即更新'}
          </button>
        )}

        {phase === 'done' && <span className="ml-auto text-xs text-green-600">更新完成，正在重启...</span>}
      </div>

      {isDownloading && renderProgress()}

      {phase === 'error' && (
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-red-600">{error || '下载出错'}</span>
          <button onClick={retry} className="px-2 py-0.5 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700">重试</button>
        </div>
      )}
    </div>
  )
}
