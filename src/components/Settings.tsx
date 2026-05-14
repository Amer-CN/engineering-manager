import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './ui/Icon'
import { useTheme } from '../hooks/useTheme'
import { useDataPath } from '../hooks/useDataPath'
import { useOCRConfig } from '../hooks/useOCRConfig'
import { useRowHoverOpacity } from '../hooks/useRowHoverOpacity'
import { SettingsOcrSection } from './SettingsOcrSection'
import SettingsChangelog from './SettingsChangelog'

interface SettingsProps { refresh?: () => void }

const Settings: React.FC<SettingsProps> = ({ refresh }) => {
  const { theme, setTheme } = useTheme()
  const rh = useRowHoverOpacity()
  const dp = useDataPath(refresh)
  const ocr = useOCRConfig()
  const [showChangelog, setShowChangelog] = useState(false)

  if (dp.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 dark:border-slate-700 border-t-primary-600"></div>
          <span className="text-slate-500">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <motion.div className="max-w-[1400px] mx-auto p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">系统设置</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">管理应用程序设置</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <div>
                <label className="label">默认路径</label>
                <div className="bg-primary-50 rounded-lg p-3 text-sm text-primary-700 font-mono break-all border border-primary-100">{dp.defaultPath}</div>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={dp.handleChangeDataPath} disabled={dp.migrating} className="btn btn-primary">
                  {dp.migrating ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>迁移中..</> : <><Icon name="FolderKanban" size={16} />更改数据存储位置</>}
                </button>
                {dp.dataPath !== dp.defaultPath && (
                  <button onClick={dp.handleResetToDefault} disabled={dp.migrating} className="btn btn-secondary"><Icon name="RotateCcw" size={16} /> 恢复默认路径</button>
                )}
              </div>
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
                <p className="text-sm text-warning-800 font-medium"><Icon name="Lightbulb" size={16} className="inline" /> 提示</p>
                <ul className="text-sm text-warning-700 mt-2 space-y-1">
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
        </div>

        <div className="space-y-6">
          <SettingsOcrSection
            ocrConfig={ocr.ocrConfig} setOcrConfig={ocr.setOcrConfig}
            ocrStatus={ocr.ocrStatus} testingOCR={ocr.testingOCR} ocrMessage={ocr.ocrMessage}
            onSave={ocr.handleSaveOCRConfig} onTest={ocr.handleTestOCR}
          />
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Palette" size={20} /> 外观主题</h2></div>
            <div className="card-body">
              <p className="text-sm text-slate-600 mb-4">选择您喜欢的界面主题，浅色和深色两种可选。</p>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setTheme('light')} className={`p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center"><Icon name="Sun" size={22} className="text-amber-500" /></div>
                    <div className="text-left"><div className="text-base font-semibold text-slate-800">浅色模式</div><div className="text-sm text-slate-500">明亮清爽</div></div>
                  </div>
                </button>
                <button onClick={() => setTheme('dark')} className={`p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary-500 bg-primary-50 shadow-md' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center"><Icon name="Moon" size={22} className="text-slate-200" /></div>
                    <div className="text-left"><div className="text-base font-semibold text-slate-800">深色模式</div><div className="text-sm text-slate-500">护眼舒适</div></div>
                  </div>
                </button>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">表格行悬停高亮</span>
                  <span className="text-xs text-slate-400 tabular-nums">{rh.opacity}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={rh.opacity}
                  onChange={e => rh.setOpacity(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none bg-slate-200 cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500
                    [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <p className="text-xs text-slate-400 mt-1.5">鼠标经过数据表格行时的背景高亮强度，越低越淡</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Wrench" size={20} /> 开发工具</h2></div>
            <div className="card-body">
              <p className="text-sm text-slate-600 mb-4">打开开发者控制台查看日志和调试信息，用于排查问题。</p>
              <div className="flex flex-wrap gap-3">
                <button onClick={async () => { try { await window.electronAPI.openDevTools() } catch (e) { console.log('快捷键提示 Ctrl+Shift+I') } }} className="btn btn-secondary"><Icon name="Monitor" size={16} />打开控制台</button>
                <span className="text-sm text-slate-400 self-center">或按 <kbd className="px-2 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-200">Ctrl+Shift+I</kbd></span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Info" size={20} /> 关于</h2></div>
            <div className="card-body">
              <div className="text-sm text-slate-600 dark:text-slate-300 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 flex items-center justify-center text-white text-3xl shadow-lg shadow-slate-500/20"><Icon name="HardHat" size={32} /></div>
                  <div><p className="text-xl font-bold text-slate-800 dark:text-slate-100">工程管家</p><p className="text-slate-500 dark:text-slate-400">Version 2.8.2</p></div>
                </div>
                <p className="text-slate-600 dark:text-slate-300">工程项目管理系统 · 本地数据存储</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowChangelog(true)} className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"><Icon name="Clock" size={14} /> 更新日志</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showChangelog && <SettingsChangelog onClose={() => setShowChangelog(false)} />}
    </motion.div>
  )
}

export default Settings
