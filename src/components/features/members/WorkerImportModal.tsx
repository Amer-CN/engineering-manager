import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import {
  WORKER_IMPORT_FIELDS, type ImportState, type ImportProgress, type ImportResult,
} from './useWorkerImport'

interface Props {
  show: boolean
  importState: ImportState | null
  progress: ImportProgress | null
  result: ImportResult | null
  phase: 'idle' | 'mapping' | 'importing' | 'done'
  error?: string | null
  onClose: () => void
  onSwitchSheet?: (name: string) => void
  onSetMapping: (key: string, colIdx: number) => void
  onGetConfidence: (key: string) => number
  onExecuteImport: () => void
  onSetHeaderRow?: (rowIdx: number) => void
  onSavePreset: (name: string) => boolean
}

export function WorkerImportModal({
  show, importState, progress, result, phase, error,
  onClose, onSwitchSheet, onSetHeaderRow, onSetMapping, onGetConfidence, onExecuteImport, onSavePreset,
}: Props) {
  const [showPresetInput, setShowPresetInput] = useState(false)
  const [presetName, setPresetName] = useState('')

  if (!show) return null

  const getConfidenceClass = (key: string) => {
    if (!importState) return ''
    const colIdx = importState.mapping[key]
    if (colIdx >= 0 && onGetConfidence(key) >= 50) return 'border-success-300 bg-success-50'
    if (colIdx >= 0) return 'border-slate-200'
    return 'border-danger-300 bg-danger-50'
  }

  const getConfidenceIcon = (key: string) => {
    if (!importState) return null
    const colIdx = importState.mapping[key]
    if (colIdx >= 0 && onGetConfidence(key) >= 50) {
      return <Icon name="CheckCircle" size={14} className="text-emerald-500" />
    }
    if (colIdx >= 0) return null
    return <Icon name="AlertCircle" size={14} className="text-red-400" />
  }

  const validateRow = (row: any[], mapping: Record<string, number>, idx: number): { valid: boolean; errors: string[] } => {
    const errors: string[] = []
    const nameIdx = mapping['name']
    const idCardIdx = mapping['idCard']

    if (nameIdx >= 0) {
      const name = String(row[nameIdx] || '').trim()
      if (!name) errors.push('缺姓名')
    }
    if (idCardIdx >= 0) {
      const idCard = String(row[idCardIdx] || '').trim()
      if (!idCard) errors.push('缺身份证号')
      else if (idCard.length !== 18 || !/^\d{17}[\dXx]$/.test(idCard)) errors.push('身份证号格式错误')
    }
    return { valid: errors.length === 0, errors }
  }

  const requiredFields = WORKER_IMPORT_FIELDS.filter(f => f.required)

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={onClose}>
      <motion.div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[92vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">导入工人</h3>
            {importState && <p className="text-sm text-slate-500 mt-0.5">{importState.fileName}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Error display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <Icon name="AlertTriangle" size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">导入失败</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}
          {/* Phase: mapping */}
          {phase === 'mapping' && importState && (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-6 flex-wrap">
                {importState.sheetNames.length > 1 && (
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">工作表：</label>
                    <select value={importState.activeSheet} onChange={e => onSwitchSheet?.(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700">
                      {importState.sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">表头行：</label>
                  <select value={importState.headerRow}
                    onChange={e => onSetHeaderRow?.(parseInt(e.target.value))}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700">
                    {Array.from({ length: 5 }, (_, i) => <option key={i} value={i}>第 {i + 1} 行</option>)}
                  </select>
                </div>
                {importState.detectedPreset && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                    <Icon name="Zap" size={14} />
                    检测到: {importState.detectedPreset}
                  </div>
                )}
              </div>

              {/* Column Mapping */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  列映射（选择每列对应的字段）
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {WORKER_IMPORT_FIELDS.map(f => (
                    <div key={f.key}>
                      <label className="text-xs text-slate-500 dark:text-slate-400 block mb-1">
                        {f.required && <span className="text-red-400 mr-0.5">*</span>}
                        {f.label}
                        {getConfidenceIcon(f.key) && <span className="ml-1 inline-flex">{getConfidenceIcon(f.key)}</span>}
                      </label>
                      <select
                        value={importState.mapping[f.key]}
                        onChange={e => onSetMapping(f.key, parseInt(e.target.value))}
                        className={`w-full px-2 py-1.5 border rounded text-sm ${getConfidenceClass(f.key)}`}
                      >
                        <option value={-1}>不导入</option>
                        {importState.headers.map((h, i) => (
                          <option key={i} value={i}>{h || `列${i + 1}`}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-2">
                  数据预览（前 {Math.min(10, importState.previewRows.length)} 行，共 {importState.allRows.length} 行）
                </label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-slate-500 w-8">#</th>
                        {importState.headers.map((h, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-slate-500 whitespace-nowrap">
                            {h || `列${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {importState.previewRows.map((row, ri) => {
                        const { valid, errors } = validateRow(row, importState.mapping, ri)
                        return (
                          <tr key={ri} className={valid ? '' : 'bg-red-50 dark:bg-red-900/20'}>
                            <td className="px-2 py-1.5 text-slate-400">
                              {valid
                                ? <Icon name="Check" size={12} className="text-emerald-500" />
                                : <span title={errors.join(', ')}><Icon name="AlertTriangle" size={12} className="text-red-400" /></span>
                              }
                            </td>
                            {importState.headers.map((_, ci) => (
                              <td key={ci} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                {row[ci] !== undefined && row[ci] !== null ? String(row[ci]) : ''}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Phase: importing */}
          {phase === 'importing' && progress && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">正在导入...</h3>
              <div className="w-full max-w-md">
                <div className="bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="bg-blue-600 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </div>
              <p className="text-sm text-slate-500">
                {progress.completed} / {progress.total} ({progress.percent}%)
              </p>
              {progress.currentName && (
                <p className="text-xs text-slate-400">当前: {progress.currentName}</p>
              )}
            </div>
          )}

          {/* Phase: done */}
          {phase === 'done' && result && (
            <div className="flex flex-col items-center py-6 space-y-4">
              {result.failed === 0 && result.skipped === 0 ? (
                <>
                  <Icon name="CheckCircle" size={48} className="text-emerald-500" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">导入完成</h3>
                </>
              ) : (
                <>
                  <Icon name="AlertTriangle" size={48} className="text-amber-500" />
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">导入完成（部分成功）</h3>
                </>
              )}
              <div className="grid grid-cols-4 gap-4 w-full max-w-lg">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{result.success}</div>
                  <div className="text-xs text-slate-500 mt-1">新增</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
                  <div className="text-xs text-slate-500 mt-1">更新</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <div className="text-2xl font-bold text-amber-500">{result.skipped}</div>
                  <div className="text-xs text-slate-500 mt-1">跳过</div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
                  <div className="text-2xl font-bold text-red-500">{result.failed}</div>
                  <div className="text-xs text-slate-500 mt-1">失败</div>
                </div>
              </div>
              {result.warnings && result.warnings.length > 0 && (
                <details className="w-full max-w-md" open>
                  <summary className="text-sm text-amber-600 cursor-pointer hover:text-amber-700 font-medium">
                    警告（{result.warnings.length} 条）
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-amber-200 dark:border-amber-700 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-amber-50 dark:bg-amber-900/20 sticky top-0">
                        <tr><th className="px-3 py-1.5 text-left font-medium text-amber-600">行号</th><th className="px-3 py-1.5 text-left font-medium text-amber-600">姓名</th><th className="px-3 py-1.5 text-left font-medium text-amber-600">说明</th></tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 dark:divide-amber-800">
                        {result.warnings.map((w, i) => (
                          <tr key={i}><td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{w.row}</td><td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{w.name}</td><td className="px-3 py-1.5 text-amber-600">{w.message}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
              {result.failures.length > 0 && (
                <details className="w-full max-w-md">
                  <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
                    失败详情（{result.failures.length} 条）
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                        <tr><th className="px-3 py-1.5 text-left font-medium text-slate-500">行号</th><th className="px-3 py-1.5 text-left font-medium text-slate-500">原因</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {result.failures.map((f, i) => (
                          <tr key={i}><td className="px-3 py-1.5 text-slate-700 dark:text-slate-300">{f.row}</td><td className="px-3 py-1.5 text-red-500">{f.reason}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          {phase === 'mapping' && importState && (
            <>
              <span className="text-sm text-slate-500">将导入 {importState.allRows.length} 人</span>
              <div className="flex items-center gap-3">
                <button onClick={onClose} className="px-6 py-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  取消
                </button>
                <button onClick={onExecuteImport} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium">
                  确认导入
                </button>
              </div>
            </>
          )}
          {(phase === 'importing') && (
            <div className="w-full text-center text-sm text-slate-400">请勿关闭窗口</div>
          )}
          {phase === 'done' && (
            <>
              <div>
                {!showPresetInput ? (
                  <button onClick={() => setShowPresetInput(true)}
                    className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    保存此映射为预设
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text" value={presetName}
                      onChange={e => setPresetName(e.target.value)}
                      placeholder="预设名称，如：蜀道HR格式"
                      className="px-3 py-1.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm w-48"
                      autoFocus
                    />
                    <button
                      onClick={() => {
                        if (presetName.trim() && onSavePreset(presetName.trim())) {
                          setShowPresetInput(false)
                          setPresetName('')
                        }
                      }}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                    >
                      保存
                    </button>
                    <button onClick={() => setShowPresetInput(false)}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-sm">取消</button>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="px-6 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors">
                关闭
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
