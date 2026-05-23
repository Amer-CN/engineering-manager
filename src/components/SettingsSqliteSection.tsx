import React from 'react'
import { Icon } from './ui/Icon'
import type { SqliteStatus, ReadMode } from '../types/electron'

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

const readModeConfig: { mode: ReadMode; label: string; desc: string; icon: string; color: string; activeColor: string }[] = [
  {
    mode: 'dual',
    label: '双写模式',
    desc: 'SQLite 优先读取，失败回退 JSON',
    icon: 'ArrowLeftRight',
    color: 'bg-slate-100',
    activeColor: 'border-primary-500 bg-primary-50 shadow-md',
  },
  {
    mode: 'sqlite-primary',
    label: 'SQLite 优先',
    desc: '仅从 SQLite 读取，失败报错',
    icon: 'Database',
    color: 'bg-blue-100',
    activeColor: 'border-blue-500 bg-blue-50 shadow-md',
  },
  {
    mode: 'json-only',
    label: '仅 JSON',
    desc: '跳过 SQLite，仅使用 JSON 文件',
    icon: 'FileJson',
    color: 'bg-amber-100',
    activeColor: 'border-amber-500 bg-amber-50 shadow-md',
  },
]

export const SettingsSqliteSection: React.FC<Props> = ({
  status, loading, enabling, migrating, switching, message,
  onEnable, onMigrate, onRemigrate, onSetReadMode,
}) => {
  if (loading) {
    return (
      <div className="card">
        <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Database" size={20} /> 数据库引擎</h2></div>
        <div className="card-body flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-200 border-t-primary-600"></div>
          <span className="ml-3 text-slate-500 text-sm">检测数据库状态...</span>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="card">
        <div className="card-header"><h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2"><Icon name="Database" size={20} /> 数据库引擎</h2></div>
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
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <Icon name="Database" size={20} /> 数据库引擎
        </h2>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
          status.ready
            ? isDataSparse
              ? 'bg-warning-100 text-warning-700'
              : status.migrated
                ? 'bg-success-100 text-success-700'
                : 'bg-warning-100 text-warning-700'
            : 'bg-slate-100 text-slate-500'
        }`}>
          {status.ready ? (isDataSparse ? '数据不完整' : status.migrated ? '已就绪' : '未迁移') : '未启用'}
        </span>
      </div>
      <div className="card-body space-y-5">
        {/* 状态概览 */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
          <span className={`w-3 h-3 rounded-full ${status.ready ? (isDataSparse ? 'bg-warning-500' : status.migrated ? 'bg-success-500 animate-pulse' : 'bg-warning-500') : 'bg-slate-400'}`}></span>
          <span className="text-sm font-medium">{status.ready ? (isDataSparse ? '数据不完整' : status.migrated ? '运行中' : '已初始化') : '未启用'}</span>
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
            <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 font-mono break-all border border-slate-200 flex items-center justify-between">
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

        {/* 启用 & 迁移按钮 */}
        {!status.ready ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">SQLite 数据库引擎尚未启用。启用后可获得更快的查询速度和更好的数据完整性保障。</p>
            <button onClick={onEnable} disabled={enabling} className="btn btn-primary">
              {enabling
                ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>启用中...</>
                : <><Icon name="Power" size={16} /> 启用 SQLite</>}
            </button>
          </div>
        ) : !status.migrated ? (
          <div className="space-y-3">
            <div className="bg-warning-50 border border-warning-200 rounded-xl p-4">
              <p className="text-sm text-warning-800"><Icon name="AlertTriangle" size={16} className="inline" /> SQLite 已启用但尚未迁移数据。当前仍在使用 JSON 文件存储。</p>
              <p className="text-sm text-warning-700 mt-1">迁移后数据将同时写入 SQLite 和 JSON，读取优先使用 SQLite。</p>
            </div>
            <button onClick={onMigrate} disabled={migrating} className="btn btn-primary">
              {migrating
                ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>迁移中...</>
                : <><Icon name="ArrowRightLeft" size={16} /> 迁移数据到 SQLite</>}
            </button>
          </div>
        ) : null}

        {/* 读取模式切换 */}
        {status.ready && status.migrated && (
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
        {status.ready && status.migrated && (
          <div className="border-t border-slate-100 pt-4">
            {isDataSparse && (
              <div className="bg-warning-50 border border-warning-200 rounded-xl p-3 mb-3">
                <p className="text-sm text-warning-800"><Icon name="AlertTriangle" size={16} className="inline" /> SQLite 数据不完整（仅 {totalRows} 行），建议点击下方按钮重新迁移数据。</p>
              </div>
            )}
            <button
              onClick={onRemigrate}
              disabled={migrating}
              className={isDataSparse ? 'btn btn-primary' : 'btn btn-secondary'}
              title="当迁移脚本更新后，使用此功能重新迁移数据"
            >
              {migrating
                ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>迁移中...</>
                : <><Icon name="RefreshCw" size={16} /> {isDataSparse ? '迁移数据到 SQLite' : '重新迁移数据'}</>}
            </button>
            <p className="text-xs text-slate-400 mt-1.5">迁移脚本更新后，可重新迁移以修复数据缺失问题。操作前会自动备份 SQLite 数据库。</p>
          </div>
        )}

        {/* 表统计 */}
        {status.ready && status.migrated && status.summary && Object.keys(status.summary).length > 0 && (
          <div>
            <label className="label">数据统计</label>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                {Object.entries(status.summary)
                  .sort(([, a], [, b]) => b - a)
                  .map(([table, count]) => (
                    <div key={table} className="flex justify-between items-center">
                      <span className="text-slate-600 truncate">{table}</span>
                      <span className="text-slate-800 font-medium tabular-nums ml-2">{count.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-sm">
                <span className="text-slate-600 font-medium">总计</span>
                <span className="text-slate-800 font-bold tabular-nums">{totalRows.toLocaleString()} 行</span>
              </div>
            </div>
          </div>
        )}

        {/* 操作提示 */}
        {status.ready && (
          <div className="bg-info-50 border border-info-200 rounded-xl p-4">
            <p className="text-sm text-info-800"><Icon name="Lightbulb" size={16} className="inline" /> <strong>说明</strong></p>
            <ul className="text-sm text-info-700 mt-2 space-y-1">
              <li>• 启用后数据同时写入 SQLite 和 JSON（双写），确保数据安全</li>
              <li>• 推荐使用"双写模式"，兼顾性能和安全</li>
              <li>• 读取模式会自动保存，重启应用后保持上次的选择</li>
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
