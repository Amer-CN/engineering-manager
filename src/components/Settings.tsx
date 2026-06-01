import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import PageHeader from '@/components/ui/PageHeader'
import { useTheme, ThemeScheme } from '@/hooks/useTheme'
import { Spinner } from '@/components/ui/Loading/Loading'
import { useDataPath } from '@/hooks/useDataPath'
import { useConfirm } from '@/hooks/useConfirm'
// APP_VERSION 从 window.__APP_VERSION__ 读取（由 index.html 注入）
import { useOCRConfig } from '@/hooks/useOCRConfig'
import { useRowHoverOpacity } from '@/hooks/useRowHoverOpacity'
import { useFontSize, FontSizeOption } from '@/hooks/useFontSize'
import { useSqliteSettings } from '@/hooks/useSqliteSettings'
import { SettingsOcrSection } from '@/components/SettingsOcrSection'
import { SettingsSqliteSection } from '@/components/SettingsSqliteSection'
import SettingsChangelog from '@/components/SettingsChangelog'
import { getAPI } from '@/services/api-adapter'

function GpuToggle() {
  const [enabled, setEnabled] = useState(true)
  const [needRestart, setNeedRestart] = useState(false)
  useEffect(() => {
    (async () => {
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
      {needRestart && <span className="text-xs text-amber-600 dark:text-amber-400">需重启</span>}
      <button onClick={toggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

interface SettingsProps { refresh?: () => void }

const Settings: React.FC<SettingsProps> = ({ refresh }) => {
  const { scheme, setScheme } = useTheme()
  const rh = useRowHoverOpacity()
  const { size: fontSize, setSize: setFontSize } = useFontSize()
  const [exportFont, setExportFont] = useState(() => {
    if (typeof window === 'undefined') return 'SimSun, serif'
    return localStorage.getItem('app-export-font') || 'SimSun, serif'
  })
  const dp = useDataPath(refresh)
  const ocr = useOCRConfig()
  const sqlite = useSqliteSettings()
  const { confirm, ConfirmDialog } = useConfirm()
  const [showChangelog, setShowChangelog] = useState(false)

  if (dp.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="max-w-[1400px] mx-auto p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <PageHeader title="系统设置" subtitle="管理应用程序设置" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 左列：数据 & 技术 ── */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="FolderKanban" size={20} /> 数据存储设置</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="label">当前数据存储路径</label>
                <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 font-mono break-all border border-slate-200">{dp.dataPath}</div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2 items-center">
                <button onClick={dp.handleChangeDataPath} disabled={dp.migrating} className="btn btn-primary">
                  <Icon name="FolderKanban" size={16} />更改数据存储位置
                </button>
                {dp.dataPath !== dp.defaultPath && (
                  <button onClick={async () => {
                    const ok = await confirm({
                      title: '恢复默认路径',
                      content: '确定要将数据路径恢复为默认位置吗？数据将被复制到新位置。',
                      confirmText: '确定恢复',
                      cancelText: '取消',
                    })
                    if (ok) dp.handleResetToDefault()
                  }} disabled={dp.migrating} className="btn btn-secondary"><Icon name="RotateCcw" size={16} /> 恢复默认路径</button>
                )}
                {/* 迁移中提示 */}
                {dp.migrating && (
                  <div className="text-sm text-amber-600 flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                    正在迁移数据...
                  </div>
                )}
              </div>
              <div className="bg-info-50 border border-info-200 rounded-xl p-4">
                <p className="text-sm text-info-800 font-medium"><Icon name="Lightbulb" size={16} className="inline" /> 提示</p>
                <ul className="text-sm text-info-700 mt-2 space-y-1">
                  <li>•更改数据路径会将所有数据（包括上传的文件）复制到新位置</li>
                  <li>•建议将数据存储在非系统盘（如 D:\工程管家数据），便于重装系统后恢复</li>
                  <li>•换设备时，只需复制整个数据文件夹到新设备即可</li>
                </ul>
              </div>
              {dp.message && (
                <div className={`rounded-xl p-4 ${dp.message.type === 'success' ? 'bg-success-50 border border-success-200 text-success-700' : 'bg-danger-50 border border-danger-200 text-danger-700'}`}>
                  <Icon name={dp.message.type === 'success' ? 'Edit3' : 'HelpCircle'} size={16} className="inline" />{dp.message.text}
                </div>
              )}
            </div>
          </div>

          <SettingsSqliteSection
            status={sqlite.status}
            loading={sqlite.loading}
            enabling={sqlite.enabling}
            migrating={sqlite.migrating}
            switching={sqlite.switching}
            message={sqlite.message}
            onEnable={sqlite.handleEnable}
            onMigrate={sqlite.handleMigrate}
            onRemigrate={sqlite.handleRemigrate}
            onSetReadMode={sqlite.handleSetReadMode}
          />

          <div className="card">
            <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Wrench" size={20} /> 开发工具</h2></div>
            <div className="card-body space-y-4">
              <div>
                <p className="text-sm text-slate-600 mb-3">打开开发者控制台查看日志和调试信息，用于排查问题。</p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={async () => {
                    try { await (await getAPI()).openDevTools() } catch (e) { console.warn('openDevTools failed:', e) }
                  }} className="btn btn-secondary"><Icon name="Monitor" size={16} />打开控制台</button>
                  <span className="text-sm text-slate-400 self-center">或按 <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">F12</kbd></span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">GPU 硬件加速</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">关闭可解决部分显卡兼容问题，重启后生效</p>
                </div>
                <GpuToggle />
              </div>
            </div>
          </div>
        </div>

        {/* ── 右列：外观 & 关于 ── */}
        <div className="space-y-6">
          <SettingsOcrSection
            ocrConfig={ocr.ocrConfig} setOcrConfig={ocr.setOcrConfig}
            ocrStatus={ocr.ocrStatus} testingOCR={ocr.testingOCR} ocrMessage={ocr.ocrMessage}
            onSave={ocr.handleSaveOCRConfig} onTest={ocr.handleTestOCR}
          />

          <div className="card">
            <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Palette" size={20} /> 外观主题</h2></div>
            <div className="card-body">
              <p className="text-sm text-slate-600 mb-3">选择一个主题</p>
              <div className="grid grid-cols-3 gap-3 mb-5">
                {([
                  { id: 'white' as ThemeScheme, name: 'White', desc: '白色 · 明亮', icon: '☀️', style: 'from-white via-slate-50 to-slate-100 border-slate-200' },
                  { id: 'sandstone' as ThemeScheme, name: 'Sandstone', desc: '暖灰 · 琥珀', icon: '🏜️', style: 'from-amber-50 via-orange-50 to-stone-100 border-amber-200' },
                  { id: 'graphite' as ThemeScheme, name: 'Graphite', desc: '深灰 · 暗夜', icon: '🌙', style: 'from-slate-700 via-slate-800 to-slate-900 border-slate-600' },
                ]).map(s => (
                  <button key={s.id} onClick={() => setScheme(s.id)}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${scheme === s.id ? 'border-primary-500 shadow-md ring-2 ring-primary-200' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800'}`}>
                    <div className={`h-10 rounded-lg mb-2 flex items-center justify-center bg-gradient-to-br ${s.style}`}>
                      <span className="text-lg">{s.icon}</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</div>
                    <div className="text-[11px] text-slate-400">{s.desc}</div>
                  </button>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">表格行悬停高亮</span>
                  <span className="text-xs text-slate-400 tabular-nums">{rh.opacity}%</span>
                </div>
                <input
                  type="range" min={10} max={100} step={5} value={rh.opacity}
                  onChange={e => rh.setOpacity(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-slate-200 cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500
                    [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <p className="text-xs text-slate-400 mt-1.5">鼠标经过数据表格行时的背景高亮强度，越低越淡</p>
              </div>

              {/* ── 界面字号 ── */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-sm font-medium text-slate-700">界面字号</span>
                <p className="text-xs text-slate-400 mt-0.5 mb-3">全局缩放所有界面文字，即时生效</p>
                <div className="flex gap-2">
                  {([
                    { id: 'small' as FontSizeOption, label: '小', desc: '14px' },
                    { id: 'medium' as FontSizeOption, label: '中', desc: '16px' },
                    { id: 'large' as FontSizeOption, label: '大', desc: '18px' },
                  ]).map(s => (
                    <button key={s.id} onClick={() => setFontSize(s.id)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                        fontSize === s.id
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {s.label}
                      <span className="block text-[10px] font-normal opacity-60 mt-0.5">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── 导出字体 ── */}
              <div className="mt-5 pt-4 border-t border-slate-100">
                <span className="text-sm font-medium text-slate-700">导出/打印字体</span>
                <p className="text-xs text-slate-400 mt-0.5 mb-3">合同、结算单等导出文档的默认字体</p>
                <div className="relative">
                  <select
                    value={exportFont}
                    onChange={e => {
                      const val = e.target.value
                      setExportFont(val)
                      localStorage.setItem('app-export-font', val)
                    }}
                    className="w-full px-3 py-2.5 rounded-lg text-sm border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary-200 appearance-none cursor-pointer"
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

          <div className="card">
            <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Info" size={20} /> 关于</h2></div>
            <div className="card-body">
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--panel-2)' }}>
                    <svg width="40" height="40" viewBox="0 0 18 18" fill="none">
                      <defs>
                        <linearGradient id="about-mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent)" />
                          <stop offset="100%" stopColor="var(--violet)" />
                        </linearGradient>
                      </defs>
                      <path d="M2 15.5 L9 2.5 L16 15.5 Z" fill="url(#about-mark-grad)" strokeLinejoin="round" />
                      <path d="M5 14 L9 6 L13 14 Z" fill="var(--panel-2)" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">工程管家</p>
                    <p className="text-slate-500 dark:text-slate-400">
                      Version {(window as any).__APP_VERSION__ || '0.67.0'}
                      <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                      <button onClick={() => setShowChangelog(true)} className="hover:underline" style={{ color: 'var(--accent)' }}>更新日志</button>
                    </p>
                  </div>
                </div>
                <p className="text-slate-600 dark:text-slate-300">工程项目管理系统 · 本地数据存储</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChangelog && <SettingsChangelog onClose={() => setShowChangelog(false)} />}
      {ConfirmDialog}
    </motion.div>
  )
}

export default Settings
