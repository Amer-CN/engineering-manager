import React, { useState } from 'react'
import { useStatusStore } from '@/store/statusStore'
import { useTheme, type ThemeScheme } from '@/hooks/useTheme'

const PAGE_NAMES: Record<string, string> = {
  dashboard: '仪表盘',
  projects: '项目管理',
  contracts: '合同台账',
  invoices: '发票管理',
  partners: '单位管理',
  hr: '人事管理',
  labor: '工人管理',
  wages: '工资管理',
  'cost-ledger': '成本台账',
  settlement: '结算办理',
  templates: '模板管理',
  drawings: '图纸管理',
  inventory: '仓库管理',
  users: '用户管理',
  settings: '系统设置',
}

const THEMES: { value: ThemeScheme; label: string }[] = [
  { value: 'white', label: 'White' },
  { value: 'graphite', label: 'Graphite' },
  { value: 'sandstone', label: 'Sandstone' },
]

const FONT_SIZES: { value: string; label: string }[] = [
  { value: 'small', label: '小 (14px)' },
  { value: 'medium', label: '中 (16px)' },
  { value: 'large', label: '大 (18px)' },
]

// 复刻 Reasonix ModelSwitcher：状态栏触发器 + 向上弹出菜单
function ModelSwitcher({
  label,
  items,
  selected,
  onPick,
}: {
  label: string
  items: { value: string; label: string }[]
  selected: string
  onPick: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  const pick = (value: string) => {
    setOpen(false)
    onPick(value)
  }

  return (
    <div className="modelsw">
      <button className="modelsw__trigger" onClick={() => setOpen(v => !v)}>
        <span className="modelsw__label">{label}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="modelsw__backdrop" onClick={() => setOpen(false)} />
          <div className="modelsw__menu" role="listbox">
            {items.map(item => (
              <button
                key={item.value}
                role="option"
                aria-selected={item.value === selected}
                className={`modelsw__item ${item.value === selected ? 'modelsw__item--current' : ''}`}
                onClick={() => pick(item.value)}
              >
                <span className="modelsw__model">{item.label}</span>
                {item.value === selected && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="modelsw__check">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const StatusBar: React.FC = () => {
  const info = useStatusStore(s => s.info)
  const { scheme, setScheme } = useTheme()

  const [fontSize, setFontSize] = useState<string>(() => {
    return document.documentElement.getAttribute('data-font-size') || 'medium'
  })

  const handleFontSize = (val: string) => {
    setFontSize(val)
    document.documentElement.setAttribute('data-font-size', val)
  }

  const pageName = info?.pageName ? PAGE_NAMES[info.pageName] || info.pageName : ''
  const selectedCount = info?.selectedCount || 0
  const currentThemeLabel = THEMES.find(t => t.value === scheme)?.label || 'White'
  const currentSizeLabel = FONT_SIZES.find(f => f.value === fontSize)?.label || '中'

  return (
    <div className="statusbar">
      <span className={`statusbar__dot`} />
      {/* 左侧：页面名 + 记录数 */}
      {pageName && <span className="statusbar__model">{pageName}</span>}
      {info && info.total > 0 && (
        <>
          <span className="statusbar__sep">·</span>
          <span className="statusbar__ctx">共 {info.total} 条，显示 {info.start}-{info.end}</span>
        </>
      )}
      {/* 中间：选中状态 */}
      {selectedCount > 0 && (
        <>
          <span className="statusbar__sep">·</span>
          <span className="statusbar__activity">已选 {selectedCount} 项</span>
        </>
      )}
      <span className="statusbar__spacer" />
      {/* 右侧：SQLite + 主题 + 字号 */}
      <span className="statusbar__cache">
        <span className="statusbar__dot" style={{ background: 'var(--success)' }} />
        SQLite
      </span>
      <MaskToggle />
      <span className="statusbar__sep">│</span>
      <ModelSwitcher
        label={currentThemeLabel}
        items={THEMES}
        selected={scheme}
        onPick={v => setScheme(v as ThemeScheme)}
      />
      <span className="statusbar__sep">│</span>
      <ModelSwitcher
        label={currentSizeLabel}
        items={FONT_SIZES}
        selected={fontSize}
        onPick={handleFontSize}
      />
    </div>
  )
}

export default StatusBar
