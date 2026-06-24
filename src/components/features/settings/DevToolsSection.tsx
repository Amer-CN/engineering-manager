import { Icon } from '@/components/ui/Icon'
import { GpuToggle } from '@/components/features/settings/GpuToggle'
import { getAPI } from '@/services/api-adapter'
import { Button } from '../../ui/Button'

/**
 * v0.76.0 累计待办 #7: Settings 剩余拆分 — 开发工具卡片
 * 包含: 打开控制台 + GPU 硬件加速开关
 */
export function DevToolsSection() {
  return (
    <div className="card">
      <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="Wrench" size={20} /> 开发工具</h2></div>
      <div className="card-body space-y-4">
        <div>
          <p className="text-sm text-slate-600 mb-3">打开开发者控制台查看日志和调试信息，用于排查问题。</p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={async () => {
              try { await (await getAPI()).openDevTools() } catch (e) { console.warn('openDevTools failed:', e) }
            }}  variant="secondary"><Icon name="Monitor" size={16} />打开控制台</Button>
            <span className="text-sm text-slate-400 self-center">或按 <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">F12</kbd></span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div>
            <p className="text-sm font-medium text-slate-700">GPU 硬件加速</p>
            <p className="text-xs text-slate-400">关闭可解决部分显卡兼容问题，重启后生效</p>
          </div>
          <GpuToggle />
        </div>
      </div>
    </div>
  )
}