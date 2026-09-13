import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { useTheme, ThemeScheme } from '@/hooks/useTheme'
import { useRowHoverOpacity } from '@/hooks/useRowHoverOpacity'
import { useFontSize, FontSizeOption } from '@/hooks/useFontSize'
import { isSfxEnabled, setSfxEnabled } from '@/lib/sfx'

/**
 * v0.76.0 累计待办 #7: Settings 剩余拆分 — 外观主题卡片
 * 包含: 主题切换 (White/Sandstone/Graphite) + 表格行悬停强度 + 界面字号 + 导出字体
 */
/**
 * 主题迷你预览色板：字面量取自 index.css 各 [data-theme] 块的真实 token。
 * 预览展示的是"目标主题"的颜色，var(--*) 会跟随当前主题渲染，所以必须写死。
 */
interface ThemeSwatchColors {
  bg: string
  panel: string
  panel2: string
  border: string
  borderStrong: string
  fg2: string
  accent: string
}

const THEME_SWATCH: Record<ThemeScheme, ThemeSwatchColors> = {
  white: { bg: 'oklch(98.6% 0.009 85)', panel: 'oklch(99.4% 0.006 85)', panel2: 'oklch(96% 0.012 83)', border: 'oklch(90% 0.012 82)', borderStrong: 'oklch(83% 0.014 80)', fg2: 'oklch(41% 0.012 72)', accent: 'oklch(28% 0.02 74)' },
  sandstone: { bg: 'oklch(98.8% 0 0)', panel: 'oklch(99.6% 0 0)', panel2: 'oklch(97.4% 0 0)', border: 'oklch(90% 0 0)', borderStrong: 'oklch(82% 0 0)', fg2: 'oklch(42% 0 0)', accent: 'oklch(30% 0 0)' },
  graphite: { bg: 'oklch(20.5% 0.003 75)', panel: 'oklch(24% 0.004 75)', panel2: 'oklch(27.5% 0.004 75)', border: 'oklch(32% 0.004 75)', borderStrong: 'oklch(40% 0.005 75)', fg2: 'oklch(72% 0.004 80)', accent: 'oklch(92% 0.004 80)' },
}

/** 迷你应用窗口：标题栏 + 侧栏（选中项 = 主题 accent）+ 内容骨架 + 主按钮 */
function ThemeSwatch({ p }: { p: ThemeSwatchColors }) {
  return (
    <div aria-hidden className="h-14 mb-2.5 rounded-lg overflow-hidden flex flex-col border"
      style={{ background: p.bg, borderColor: p.border }}>
      <div className="h-[10px] shrink-0 flex items-center justify-between px-1.5 border-b"
        style={{ background: p.panel, borderColor: p.border }}>
        <span className="w-[3px] h-[3px] rounded-full" style={{ background: p.borderStrong }} />
        <span className="w-2 h-[2px] rounded-full" style={{ background: p.borderStrong }} />
      </div>
      <div className="flex-1 flex min-h-0">
        <div className="w-7 shrink-0 border-r p-1 flex flex-col gap-[3px]"
          style={{ background: p.panel2, borderColor: p.border }}>
          <span className="h-[4px] rounded-full" style={{ background: p.accent }} />
          <span className="h-[3px] w-4/5 rounded-full" style={{ background: p.borderStrong }} />
          <span className="h-[3px] w-3/5 rounded-full" style={{ background: p.borderStrong }} />
        </div>
        <div className="flex-1 min-w-0 p-1.5 flex flex-col gap-[3px]">
          <span className="h-[4px] w-1/2 rounded-full" style={{ background: p.fg2 }} />
          <span className="h-[3px] rounded-full" style={{ background: p.border }} />
          <span className="h-[3px] w-5/6 rounded-full" style={{ background: p.border }} />
          <span className="flex-1" />
          <span className="h-2 w-5 rounded-[3px] self-end" style={{ background: p.accent }} />
        </div>
      </div>
    </div>
  )
}

export function AppearanceSection() {
  const { scheme, setScheme } = useTheme()
  const rh = useRowHoverOpacity()
  const { size: fontSize, setSize: setFontSize } = useFontSize()
  const [exportFont, setExportFont] = useState(() => {
    if (typeof window === 'undefined') return 'SimSun, serif'
    return localStorage.getItem('app-export-font') || 'SimSun, serif'
  })
  const [sfxOn, setSfxOn] = useState(() => isSfxEnabled())

  return (
    <div className="card">
      <div className="card-header"><h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Palette" size={20} /> 外观主题</h2></div>
      <div className="card-body">
        <p className="text-sm text-[color:var(--fg-2)] mb-3">选择一个主题</p>
        <div className="grid grid-cols-3 gap-3 mb-5">
          {([
            { id: 'white' as ThemeScheme, name: 'White', desc: '白色 · 明亮' },
            { id: 'sandstone' as ThemeScheme, name: 'Sandstone', desc: '暖灰 · 琥珀' },
            { id: 'graphite' as ThemeScheme, name: 'Graphite', desc: '深灰 · 暗夜' },
          ]).map(s => (
            <button key={s.id} onClick={() => setScheme(s.id)}
              className={`p-3 rounded-xl border-2 transition-[border-color,background-color,box-shadow] text-left ${scheme === s.id ? 'border-[color:var(--accent)] shadow-md ring-2 ring-[color:var(--accent-soft)]' : 'border-[color:var(--border)] hover:border-[color:var(--border)] bg-[color:var(--card)]'}`}>
              <ThemeSwatch p={THEME_SWATCH[s.id]} />
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
                className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-[background-color,color,box-shadow,border-color] ${
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

        {/* ── 界面音效 */}
        <div className="mt-5 pt-4 border-t border-[color:var(--border)]">
          <span className="text-sm font-medium text-[color:var(--fg-2)]">界面音效</span>
          <p className="text-xs text-[color:var(--muted)] mt-0.5 mb-3">报错传真机等界面操作音效，关闭后完全静音（动画与流程不变）</p>
          <div className="flex bg-[color:var(--panel-2)] rounded-lg p-1 border border-[color:var(--border)]">
            {([
              { id: true as const, label: '开' },
              { id: false as const, label: '关' },
            ]).map(s => (
              <button key={String(s.id)} onClick={() => { setSfxOn(s.id); setSfxEnabled(s.id) }}
                className={`flex-1 px-4 py-1.5 text-sm font-medium rounded-md transition-[background-color,color,box-shadow,border-color] ${
                  sfxOn === s.id
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
              className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] appearance-none cursor-pointer text-foreground"
            >
              <option value="SimSun, serif">宋体（正式 · 推荐）</option>
              <option value="SimHei, sans-serif">黑体（清晰）</option>
              <option value="KaiTi, serif">楷体（美观）</option>
              <option value="Microsoft YaHei, sans-serif">微软雅黑（现代）</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5 L6 8 L9 5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}