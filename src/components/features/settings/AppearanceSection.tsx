import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useTheme, ThemeScheme } from '@/hooks/useTheme'
import { useRowHoverOpacity } from '@/hooks/useRowHoverOpacity'
import { useFontSize, FontSizeOption } from '@/hooks/useFontSize'

/**
 * v0.76.0 累计待办 #7: Settings 剩余拆分 — 外观主题卡片
 * 包含: 主题切换 (White/Sandstone/Graphite) + 表格行悬停强度 + 界面字号 + 导出字体
 */
export function AppearanceSection() {
  const { scheme, setScheme } = useTheme()
  const rh = useRowHoverOpacity()
  const { size: fontSize, setSize: setFontSize } = useFontSize()
  const [exportFont, setExportFont] = useState(() => {
    if (typeof window === 'undefined') return 'SimSun, serif'
    return localStorage.getItem('app-export-font') || 'SimSun, serif'
  })

  return (
    <div className="card">
      <div className="card-header"><h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Palette" size={20} /> 外观主题</h2></div>
      <div className="card-body">
        <p className="text-sm text-[color:var(--fg-2)] mb-3">选择一个主题</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {([
            { id: 'white' as ThemeScheme, name: 'White', desc: '白色 · 明亮', icon: '☀️', style: 'from-white via-slate-50 to-slate-100 border-[color:var(--border)]' },
            { id: 'sandstone' as ThemeScheme, name: 'Sandstone', desc: '暖灰 · 琥珀', icon: '🏜️', style: 'from-warning-50 via-orange-50 to-stone-100 border-warning-200' },
            { id: 'graphite' as ThemeScheme, name: 'Graphite', desc: '深灰 · 暗夜', icon: '🌙', style: 'from-slate-700 via-slate-800 to-slate-900 border-[color:var(--border-strong)]' },
          ]).map(s => (
            <button key={s.id} onClick={() => setScheme(s.id)}
              className={`p-3 rounded-xl border-2 transition-all text-left ${scheme === s.id ? 'border-[color:var(--accent)] shadow-md ring-2 ring-[color:var(--accent-soft)]' : 'border-[color:var(--border)] hover:border-[color:var(--border)] bg-[color:var(--card)]'}`}>
              <div className={`h-10 rounded-lg mb-2 flex items-center justify-center bg-gradient-to-br ${s.style}`}>
                <span className="text-lg">{s.icon}</span>
              </div>
              <div className="text-sm font-semibold text-[color:var(--fg)]">{s.name}</div>
              <div className="text-micro text-[color:var(--muted)]">{s.desc}</div>
            </button>
          ))}
        </div>

        {/* ── 表格行悬停高亮 */}
        <div className="mt-5 pt-4 border-t border-[color:var(--border)]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[color:var(--fg-2)]">表格行悬停高亮</span>
            <span className="text-xs text-[color:var(--muted)] tabular-nums">{rh.opacity}%</span>
          </div>
          <input
            type="range" min={10} max={100} step={5} value={rh.opacity}
            onChange={e => rh.setOpacity(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-[color:var(--panel-2)] cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--accent)]
              [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
          />
          <p className="text-xs text-[color:var(--muted)] mt-1.5">鼠标经过数据表格行时的背景高亮强度，越低越淡</p>
        </div>

        {/* ── 界面字号 (S33 segmented control) */}
        <div className="mt-5 pt-4 border-t border-[color:var(--border)]">
          <span className="text-sm font-medium text-[color:var(--fg-2)]">界面字号</span>
          <p className="text-xs text-[color:var(--muted)] mt-0.5 mb-3">全局缩放所有界面文字，即时生效</p>
          <div className="flex bg-[color:var(--panel-2)] rounded-lg p-1 border border-[color:var(--border)]">
            {([
              { id: 'small' as FontSizeOption, label: '较小' },
              { id: 'medium' as FontSizeOption, label: '标准' },
              { id: 'large' as FontSizeOption, label: '较大' },
            ]).map(s => (
              <button key={s.id} onClick={() => setFontSize(s.id)}
                className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  fontSize === s.id
                    ? 'bg-[color:var(--card)] text-[color:var(--fg)] shadow-sm border border-[color:var(--border)]'
                    : 'text-[color:var(--fg-2)] hover:text-[color:var(--fg)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 导出字体 */}
        <div className="mt-5 pt-4 border-t border-[color:var(--border)]">
          <span className="text-sm font-medium text-[color:var(--fg-2)]">导出/打印字体</span>
          <p className="text-xs text-[color:var(--muted)] mt-0.5 mb-3">合同、结算单等导出文档的默认字体</p>
          <div className="relative">
            <select
              value={exportFont}
              onChange={e => {
                const val = e.target.value
                setExportFont(val)
                localStorage.setItem('app-export-font', val)
              }}
              className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] appearance-none cursor-pointer"
              style={{ color: 'var(--fg)' }}
            >
              <option value="SimSun, serif">宋体（正式 · 推荐）</option>
              <option value="SimHei, sans-serif">黑体（清晰）</option>
              <option value="KaiTi, serif">楷体（美观）</option>
              <option value="Microsoft YaHei, sans-serif">微软雅黑（现代）</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--muted)' }}>
                <path d="M3 5 L6 8 L9 5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}