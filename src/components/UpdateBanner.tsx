import { useEffect, useState } from 'react'
import { checkUpdate, type UpdateCheck } from '../services/update-client'

export function UpdateBanner() {
  const [info, setInfo] = useState<UpdateCheck | null>(null)

  useEffect(() => {
    checkUpdate().then(r => { if (r?.hasUpdate) setInfo(r) }).catch(() => {})
  }, [])

  if (!info?.hasUpdate) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm flex items-center gap-2">
      <span className="text-amber-800">
        🚀 发现新版本 <strong>{info.latest}</strong>（当前 {info.current}）
      </span>
      {info.forced && (
        <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-xs font-medium">
          需强制更新
        </span>
      )}
    </div>
  )
}
