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

  return (
    <div className={`px-4 py-2 text-sm flex items-center gap-2 flex-wrap border-b ${info.forced ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <span className={info.forced ? 'text-red-800' : 'text-amber-800'}>
        🚀 发现新版本 <strong>{info.latest}</strong>（当前 {info.current}）
      </span>
      {info.forced && (
        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-medium">
          需强制更新
        </span>
      )}
      <button
        onClick={handleUpdate}
        disabled={busy}
        className={`ml-auto px-3 py-1 rounded text-xs font-medium transition-colors ${
          busy
            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
            : info.forced
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {busy ? '下载中…' : '立即更新'}
      </button>
      {error && <span className="text-red-600 text-xs w-full">{error}</span>}
    </div>
  )
}