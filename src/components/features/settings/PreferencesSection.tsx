import { useState, useEffect } from 'react'
import { Icon } from '@/components/ui/Icon'
import { NAV_ITEMS } from '@/routes'
import { PREF_KEYS, loadPref, savePref } from '@/utils/appPrefs'

/** 提示停留时长选项 (毫秒). '3000'=当前默认行为 */
const TOAST_DURATION_OPTIONS = [
  { value: '2000', label: '短', desc: '2 秒' },
  { value: '3000', label: '正常', desc: '3 秒' },
  { value: '5000', label: '长', desc: '5 秒' },
]

/**
 * 通知与偏好面板 (v0.83.0 设置页重构)
 * 子区: 默认起始页 / 提示停留时长
 * 偏好走 appPrefs (localStorage 缓存 + 后端 user-preferences 同步)
 */
export function PreferencesSection() {
  const [startPage, setStartPage] = useState('dashboard')
  const [toastDuration, setToastDuration] = useState('3000')

  useEffect(() => {
    let alive = true
    loadPref(PREF_KEYS.defaultStartPage, 'dashboard').then(v => { if (alive) setStartPage(v) })
    loadPref(PREF_KEYS.toastDuration, '3000').then(v => { if (alive) setToastDuration(v) })
    return () => { alive = false }
  }, [])

  const handleStartPageChange = (value: string) => {
    setStartPage(value)
    void savePref(PREF_KEYS.defaultStartPage, value)
  }

  const handleToastDurationChange = (value: string) => {
    setToastDuration(value)
    void savePref(PREF_KEYS.toastDuration, value)
  }

  return (
    <div className="space-y-6">
      {/* ── 默认起始页 ── */}
      <div id="default-start-page" data-setting-anchor className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Home" size={20} /> 默认起始页</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-[color:var(--fg-2)] mb-3">登录后默认打开的页面。</p>
          <div className="relative max-w-xs">
            <select
              value={startPage}
              onChange={e => handleStartPageChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm border border-[color:var(--border)] bg-[color:var(--card)] focus:outline-none focus:ring-2 focus:ring-[color:var(--accent-soft)] appearance-none cursor-pointer"
              style={{ color: 'var(--fg)' }}
            >
              {NAV_ITEMS.map(item => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <Icon name="ChevronDown" size={14} className="text-[color:var(--muted)]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 提示停留时长 ── */}
      <div id="toast-duration" data-setting-anchor className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-[color:var(--fg)] flex items-center gap-2"><Icon name="Bell" size={20} /> 提示停留时长</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-[color:var(--fg-2)] mb-3">操作成功/失败等提示消息在屏幕上停留的时间。</p>
          <div className="flex gap-2 max-w-md">
            {TOAST_DURATION_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => handleToastDurationChange(opt.value)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  toastDuration === opt.value
                    ? 'border-[color:var(--accent)] bg-[color:var(--accent-soft)] text-[color:var(--accent)]'
                    : 'border-[color:var(--border)] text-[color:var(--fg-2)] hover:border-[color:var(--border)]'
                }`}
              >
                {opt.label}
                <span className="block text-caption font-normal opacity-60 mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
