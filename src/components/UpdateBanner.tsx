import { useEffect, useState } from 'react'
import { checkUpdate, downloadUpdate, applyUpdate, type UpdateCheck } from '../services/update-client'

export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateCheck | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkUpdate().then(r => { if (r?.hasUpdate) setInfo(r) }).catch(() => {})
  }, [])

  const handleUpdate = async () => {
    setBusy(true)
    setError(null)
    try {
      const path = await downloadUpdate()
      if (!path) {
        setError('下载失败，请稍后重试')
        setBusy(false)
        return
      }
      await applyUpdate(path)
      // app 即将退出重启，不更新状态
    } catch {
      setError('更新失败，请稍后重试')
      setBusy(false)
    }
  }

  if (!info?.hasUpdate) return null

  // ── 强更：全屏遮罩（不可关闭） ──
  if (info.forced) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-2xl px-8 py-10 max-w-sm w-full mx-4 text-center">
          <div className="text-4xl mb-4">🚀</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">发现新版本</h2>
          <p className="text-sm text-gray-600 mb-1">
            <strong className="text-gray-900">{info.latest}</strong>（当前 {info.current}）
          </p>
          <p className="text-sm text-red-600 font-medium mb-6">此版本需强制更新</p>

          <button
            onClick={handleUpdate}
            disabled={busy}
            className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              busy
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {busy ? '下载中…' : '立即更新'}
          </button>
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>
      </div>
    )
  }

  // ── 非强更：行内 banner ──
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm flex items-center gap-2 flex-wrap">
      <span className="text-amber-800">
        🚀 发现新版本 <strong>{info.latest}</strong>（当前 {info.current}）
      </span>
      <button
        onClick={handleUpdate}
        disabled={busy}
        className={`ml-auto px-3 py-1 rounded text-xs font-medium transition-colors ${
          busy
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {busy ? '下载中…' : '立即更新'}
      </button>
      {error && <span className="text-red-600 text-xs w-full">{error}</span>}
    </div>
  )
}