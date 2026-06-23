import React from 'react'
import { Icon } from './ui/Icon'
import ButtonLoader from './ui/ButtonLoader'
import { Button } from './ui/Button'
import type { SqliteStatus, ReadMode } from '../types/electron'
import { readModeConfig } from './features/settings/sqliteConstants'
import { SqliteHealthCheck } from './features/settings/SqliteHealthCheck'
import { SqliteTableSummary } from './features/settings/SqliteTableSummary'

interface Props {
  status: SqliteStatus | null
  loading: boolean
  enabling: boolean
  migrating: boolean
  switching: boolean
  message: { type: 'success' | 'error' | 'info' | 'warning'; text: string } | null
  onEnable: () => void
  onMigrate: () => void
  onRemigrate: () => void
  onSetReadMode: (mode: ReadMode) => void
}

export const SettingsSqliteSection: React.FC<Props> = ({
  status, loading, enabling, migrating, switching, message,
  onEnable, onMigrate, onRemigrate, onSetReadMode,
}) => {
  if (loading) {
    return (
      <div className="card">
        <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="Database" size={20} /> 智能数据引擎</h2></div>
        <div className="card-body flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-primary-600"></div>
          <span className="ml-3 text-slate-500 text-sm">AI 正在检测数据状态...</span>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="card">
        <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Icon name="Database" size={20} /> 数据库引擎</h2></div>
        <div className="card-body">
          <div className="bg-danger-50 border border-danger-200 rounded-xl p-4">
            <p className="text-sm text-danger-700"><Icon name="AlertTriangle" size={16} className="inline" /> 无法获取 SQLite 状态</p>
          </div>
        </div>
      </div>
    )
  }

  const currentMode = status.readMode || 'dual'
  const totalRows = status.summary ? Object.values(status.summary).filter(v => v > 0).reduce((a, b) => a + b, 0) : 0
  const isDataSparse = status.migrated && totalRows < 50  // 已标记迁移但数据很少，可能需要重新迁移

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <Icon name="Database" size={20} /> 智能数据引擎
        </h2>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
          status.ready
            ? isDataSparse
              ? 'bg-warning-100 text-warning-700'
              : 'bg-success-100 text-success-700'
            : 'bg-info-100 text-info-700'
        }`}>
          {status.ready ? (isDataSparse ? 'AI 检测到数据不完整' : 'AI 已优化存储') : 'AI 正在初始化...'}
        </span>
      </div>
      <div className="card-body space-y-5">
        {/* 状态概览 */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className={`w-3 h-3 rounded-full ${status.ready ? (isDataSparse ? 'bg-warning-500' : 'bg-success-500 animate-pulse') : 'bg-info-500 animate-pulse'}`}></span>
          <span className="text-sm font-medium">{status.ready ? (isDataSparse ? 'AI 检测到数据需要补全' : 'AI 持续优化中') : 'AI 正在为您配置数据引擎...'}</span>
          {status.ready && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-sm text-slate-600">读取模式: <span className="font-medium text-slate-800">{readModeConfig.find(m => m.mode === currentMode)?.label}</span></span>
            </>
          )}
        </div>

        {/* 数据库路径 & 大小 */}
        {status.ready && status.dbPath && (
          <div>
            <label className="label">数据库文件</label>
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 font-mono break-all border border-slate-200 flex items-center justify-between">
              <span>{status.dbPath}</span>
              {status.dbSize != null && (
                <span className="text-slate-500 text-xs ml-3 whitespace-nowrap">
                  {status.dbSize < 1024 ? `${status.dbSize} B`
                    : status.dbSize < 1024 * 1024 ? `${(status.dbSize / 1024).toFixed(1)} KB`
                    : `${(status.dbSize / (1024 * 1024)).toFixed(2)} MB`}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 自动迁移状态提示 */}
        {!status.ready && (
          <div className="bg-info-50 border border-info-200 rounded-xl p-4">
            <p className="text-sm text-info-800"><Icon name="Loader" size={16} className="inline animate-spin" /> AI 正在为您配置智能数据引擎，请稍候...</p>
          </div>
        )}
        {status.ready && !status.migrated && (
          <div className="bg-info-50 border border-info-200 rounded-xl p-4">
            <p className="text-sm text-info-800"><Icon name="Loader" size={16} className="inline animate-spin" /> AI 正在智能整理您的数据，优化存储结构...</p>
          </div>
        )}

        {/* 读取模式切换 */}
        {status.ready && (
          <div>
            <label className="label">选择读取模式</label>
            <div className="grid grid-cols-3 gap-3">
              {readModeConfig.map(({ mode, label, desc, icon, activeColor }) => (
                <button
                  key={mode}
                  onClick={() => onSetReadMode(mode)}
                  disabled={switching}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    currentMode === mode ? activeColor : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon name={icon} size={18} className={currentMode === mode ? 'text-primary-600' : 'text-slate-500'} />
                    <span className={`text-sm font-semibold ${currentMode === mode ? 'text-slate-800' : 'text-slate-700'}`}>{label}</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </button>
              ))}
            </div>
            {currentMode === 'sqlite-primary' && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-700"><Icon name="Info" size={14} className="inline" /> <strong>验证模式</strong>：读取失败时返回错误而非回退 JSON，用于确认 SQLite 数据是否完整。验证完毕后建议切回"双写模式"。</p>
              </div>
            )}
            {currentMode === 'json-only' && (
              <div className="mt-3 bg-warning-50 border border-warning-200 rounded-xl p-3">
                <p className="text-xs text-warning-700"><Icon name="AlertTriangle" size={14} className="inline" /> <strong>应急模式</strong>：跳过所有 SQLite 读取，仅使用 JSON 文件。适用于 SQLite 损坏时的紧急回退。</p>
              </div>
            )}
          </div>
        )}

        {/* 重新迁移（已就绪状态下显示） */}
        {status.ready && (
          <div className="border-t border-slate-100 pt-4">
            {isDataSparse && (
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 mb-3">
                <p className="text-sm text-warning-800"><Icon name="AlertTriangle" size={16} className="inline" /> AI 检测到部分数据尚未同步（{totalRows} 行），点击下方按钮补全。</p>
              </div>
            )}
            <div className="relative inline-block group">
              <Button
                variant={isDataSparse ? 'primary' : 'secondary'}
                onClick={onRemigrate}
                disabled={migrating || !isDataSparse}
                className={!isDataSparse ? 'opacity-50 cursor-not-allowed' : undefined}>
                <ButtonLoader loading={migrating} loadingText="AI 正在同步...">
                  <><Icon name="RefreshCw" size={16} /> {isDataSparse ? 'AI 同步数据' : '重新优化存储'}</>
                </ButtonLoader>
              </Button>
              {/* 悬停浮窗 */}
              <div className="absolute left-0 bottom-full mb-2 w-80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none group-hover:pointer-events-auto">
                <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 space-y-2 text-xs">
                  <p className="font-semibold text-slate-700">什么时候需要点这个按钮？</p>
                  <p><span className="text-emerald-600 font-medium">可以点：</span><span className="text-slate-600">软件提示"数据不完整"时，说明部分数据没有迁移到新引擎，点击此按钮可以补全。</span></p>
                  <p><span className="text-amber-600 font-medium">不需要点：</span><span className="text-slate-600">软件正常运行、没有提示数据问题时，此按钮会自动禁用，无需操作。</span></p>
                  <p className="text-slate-400 border-t border-slate-100 pt-1.5">操作前会自动备份，放心使用。</p>
                </div>
                {/* 箭头 */}
                <div className="absolute left-6 top-full w-3 h-3 bg-white border-b border-r border-slate-200 rotate-45 -mt-1.5"></div>
              </div>
            </div>
          </div>
        )}

        {/* 表统计 */}
        {status.ready && status.summary && Object.keys(status.summary).length > 0 && (
          <div>
            <label className="label">数据统计</label>
            <SqliteTableSummary summary={status.summary} />
          </div>
        )}

        {/* 数据健康检查 */}
        {status.ready && (
          <div className="border-t border-slate-100 pt-4">
            <SqliteHealthCheck enabled={status.ready} />
          </div>
        )}

        {/* 操作提示 */}
        {status.ready && (
          <div className="bg-info-50 border border-info-200 rounded-xl p-4">
            <p className="text-sm text-info-800"><Icon name="Lightbulb" size={16} className="inline" /> <strong>AI 数据保护</strong></p>
            <ul className="text-sm text-info-700 mt-2 space-y-1">
              <li>• AI 自动备份您的数据，双重存储确保万无一失</li>
              <li>• 推荐保持默认模式，AI 会自动选择最优方案</li>
              <li>• 所有设置自动保存，无需手动操作</li>
            </ul>
          </div>
        )}

        {/* 消息 */}
        {message && (
          <div className={`rounded-xl p-4 ${
            message.type === 'success' ? 'bg-success-50 border border-success-200 text-success-700' :
            message.type === 'warning' ? 'bg-warning-50 border border-warning-200 text-warning-700' :
            message.type === 'info' ? 'bg-info-50 border border-info-200 text-info-700' :
            'bg-danger-50 border border-danger-200 text-danger-700'
          }`}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  )
}
