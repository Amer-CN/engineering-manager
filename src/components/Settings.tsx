import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PageHeader from '@/components/ui/PageHeader'
import { usePermission } from '@/hooks/usePermission'
import { useAuth } from '@/hooks/useAuth'
import { SETTING_CATEGORIES, type SettingCategory, type SettingItem, searchSettings } from '@/constants/settingsIndex'
import { SettingsNav } from '@/components/features/settings/SettingsNav'
import { SettingsSearch } from '@/components/features/settings/SettingsSearch'
import { AccountSection } from '@/components/features/settings/AccountSection'
import { AppearanceSection } from '@/components/features/settings/AppearanceSection'
import { AiCapabilitySection } from '@/components/features/settings/AiCapabilitySection'
import { DataStorageSection } from '@/components/features/settings/DataStorageSection'
import { PreferencesSection } from '@/components/features/settings/PreferencesSection'
import { AboutHelpSection } from '@/components/features/settings/AboutHelpSection'
import { Icon } from '@/components/ui/Icon'
import { EASE_OUT } from '@/constants/animations'
import Mascot from '@/components/features/agent/Mascot'
import { useMascotAppearance } from '@/hooks/useMascotAppearance'

/**
 * 吉祥物形象设置（挂在「外观」面板之下）：2 形 3 色精选池，
 * 选择经 useMascotAppearance 持久化并同步到全应用 Mascot 实例。
 */
const SHAPE_OPTIONS = [
  { id: 'cercle', label: '圆形' },
  { id: 'triangle', label: '三角' },
]
const COLOR_OPTIONS = [
  { id: 'encre', label: '墨黑' },
  { id: 'creme', label: '米白' },
  { id: 'ambre', label: '琥珀' },
]

function MascotAppearanceSection() {
  const { shape, color, setShape, setColor } = useMascotAppearance()
  const itemClass = (sel: boolean) =>
    `p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-[border-color,box-shadow] ${
      sel
        ? 'border-[color:var(--accent)] shadow-md ring-2 ring-[color:var(--accent-soft)]'
        : 'border-[color:var(--border)] hover:border-[color:var(--border-strong)] bg-[color:var(--card)]'
    }`
  return (
    <div className="card mt-6">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Bot" size={20} /> 吉祥物形象</h2>
      </div>
      <div className="card-body">
        <p className="text-sm text-[color:var(--fg-2)] mb-3">形状</p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {SHAPE_OPTIONS.map(s => (
            <button key={s.id} onClick={() => setShape(s.id)} className={itemClass(shape === s.id)}>
              <div style={{ pointerEvents: 'none' }}>
                <Mascot size={72} state="idle" follow={false} shape={s.id} color={color} />
              </div>
              <span className="text-sm font-semibold text-[color:var(--fg)]">{s.label}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-[color:var(--fg-2)] mb-3">颜色</p>
        <div className="grid grid-cols-3 gap-3">
          {COLOR_OPTIONS.map(c => (
            <button key={c.id} onClick={() => setColor(c.id)} className={itemClass(color === c.id)}>
              <div style={{ pointerEvents: 'none' }}>
                <Mascot size={72} state="idle" follow={false} shape={shape} color={c.id} />
              </div>
              <span className="text-sm font-semibold text-[color:var(--fg)]">{c.label}</span>
            </button>
          ))}
        </div>
        <p className="text-caption text-[color:var(--muted)] mt-3">颜色会随浅色/深色主题自动适配对比度</p>
      </div>
    </div>
  )
}

/**
 * 系统设置 (v0.83.0 重构)
 *
 * 结构: 左侧分类导航 + 搜索  |  右侧当前分类面板 (按需挂载)
 * 治卡顿关键: 数据 hook (useOCRConfig / useSqliteSettings / useDataPath) 全部下沉到
 *   各自面板内部, 只有选中该分类时对应面板才挂载 → 进设置只打当前面板的接口,
 *   不再一次性并发 6~8 个请求。
 *
 * 亮点: 设置内搜索 (SettingsSearch) — 关键词即时过滤 + 跳转定位高亮。
 */
interface SettingsProps { refresh?: () => void }

const ACTIVE_KEY = 'settings_active_category'

const Settings: React.FC<SettingsProps> = ({ refresh }) => {
  const { isAdmin } = usePermission()
  const { currentUser } = useAuth()
  const [active, setActive] = useState<SettingCategory>(() => {
    try {
      const v = localStorage.getItem(ACTIVE_KEY) as SettingCategory | null
      if (v && SETTING_CATEGORIES.some(c => c.id === v)) return v
    } catch { /* 隐私模式忽略 */ }
    return 'account'
  })
  const [query, setQuery] = useState('')

  useEffect(() => {
    try { localStorage.setItem(ACTIVE_KEY, active) } catch { /* ignore */ }
  }, [active])

  const results = query.trim() ? searchSettings(query, isAdmin()) : []

  // 搜索命中 → 切分类 + 滚动定位 + 短暂高亮 (等目标面板挂载后执行)
  const navigateToItem = (item: SettingItem) => {
    setActive(item.category)
    setQuery('')
    setTimeout(() => {
      const el = document.getElementById(item.id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('setting-anchor-highlight')
        setTimeout(() => el.classList.remove('setting-anchor-highlight'), 1400)
      }
    }, 160)
  }

  const renderPanel = () => {
    switch (active) {
      case 'account': return <AccountSection />
      case 'appearance': return (<><AppearanceSection /><MascotAppearanceSection /></>)
      case 'ai': return <AiCapabilitySection />
      case 'data': return <DataStorageSection refresh={refresh} />
      case 'preferences': return <PreferencesSection />
      case 'about': return <AboutHelpSection />
      default: return <AccountSection />
    }
  }

  return (
    <motion.div className="max-w-[1400px] mx-auto p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <PageHeader title="系统设置" subtitle="管理应用程序设置" />

      <div className="flex gap-6 items-start">
        {/* 左栏：用户片段 + 搜索 + 分类导航 */}
        <div className="w-60 flex-shrink-0">
          {/* S33 Stitch: user profile snippet */}
          {currentUser && (
            <div className="flex items-center gap-3 mb-5 px-1">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-[color:var(--panel-2)] border border-[color:var(--border)]">
                <Icon name="User" size={20} className="text-[color:var(--muted)]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[color:var(--fg)] truncate">{currentUser.displayName || currentUser.username}</p>
                <p className="text-xs text-[color:var(--muted)] truncate">{currentUser.roleName || '用户'}</p>
              </div>
            </div>
          )}
          <SettingsSearch query={query} onQueryChange={setQuery} results={results} onSelect={navigateToItem} />
          {!query.trim() && <SettingsNav active={active} onSelect={setActive} />}
        </div>

        {/* 右栏：当前面板 (按需挂载) */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              {renderPanel()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

export default Settings
