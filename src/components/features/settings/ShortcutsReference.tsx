import { Icon } from '@/components/ui/Icon'

/** 全局快捷键 (仅收录 App.tsx 中真实接线的项, 避免列出无效快捷键) */
const SHORTCUTS: { keys: string[]; desc: string }[] = [
  { keys: ['Ctrl', 'B'], desc: '折叠 / 展开侧边栏' },
  { keys: ['Ctrl', 'L'], desc: '锁定屏幕' },
  { keys: ['F11'], desc: '进入全屏' },
  { keys: ['Esc'], desc: '退出全屏' },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200 text-slate-700 min-w-[28px] inline-flex items-center justify-center">
      {children}
    </kbd>
  )
}

/**
 * 快捷键参考 (v0.83.0 设置页重构 · 关于与帮助子区)
 * 静态列表, 无副作用/请求
 */
export function ShortcutsReference() {
  return (
    <div id="shortcuts" data-setting-anchor className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="Zap" size={20} /> 快捷键参考</h2>
      </div>
      <div className="card-body">
        <div className="divide-y divide-slate-100">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-slate-600">{s.desc}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, j) => (
                  <span key={j} className="flex items-center gap-1">
                    {j > 0 && <span className="text-slate-300 text-xs">+</span>}
                    <Kbd>{k}</Kbd>
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
