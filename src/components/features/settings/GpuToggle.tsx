import { useState, useEffect } from 'react'
import { getAPI } from '@/services/api-adapter'

/**
 * GPU 加速开关 (读写 api.getGpuAcceleration / api.setGpuAcceleration)
 * - 切换成功显示 "需重启" 提示
 */
export function GpuToggle() {
  const [enabled, setEnabled] = useState(true)
  const [needRestart, setNeedRestart] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await (await getAPI()).getGpuAcceleration()
        if (res.success) setEnabled(res.enabled)
      } catch {}
    })()
  }, [])

  const toggle = async () => {
    const res = await (await getAPI()).setGpuAcceleration(!enabled)
    if (res.success) {
      setEnabled(res.enabled)
      setNeedRestart(res.needRestart)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {needRestart && <span className="text-xs text-amber-600">需重启</span>}
      <button onClick={toggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
