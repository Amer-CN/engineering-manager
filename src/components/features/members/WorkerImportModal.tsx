import { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import { HoverScrollbar } from '../../ui/HoverScrollbar'
import {
  type ImportState, type ImportProgress, type ImportResult,
} from './useWorkerImport'
import { MappingPhase, ImportingPhase, DonePhase } from './WorkerImportPhase'
import { Button } from '../../ui/Button'

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

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={onClose}>
      <motion.div
        className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[92vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">导入工人</h3>
            {importState && <p className="text-sm text-slate-500 mt-0.5">{importState.fileName}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <Icon name="X" size={20} />
          </button>
        </div>

        <HoverScrollbar className="flex-1 p-6 space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <Icon name="AlertTriangle" size={20} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">导入失败</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}
          {phase === 'mapping' && importState && (
            <MappingPhase
              importState={importState}
              onSwitchSheet={onSwitchSheet}
              onSetHeaderRow={onSetHeaderRow}
              onSetMapping={onSetMapping}
              onGetConfidence={onGetConfidence}
            />
          )}
          {phase === 'importing' && progress && <ImportingPhase progress={progress} />}
          {phase === 'done' && result && <DonePhase result={result} />}
        </HoverScrollbar>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          {phase === 'mapping' && importState && (
            <>
              <span className="text-sm text-slate-500">将导入 {importState.allRows.length} 人</span>
              <div className="flex items-center gap-3">
                <Button onClick={onClose}  variant="secondary">取消</Button>
                <Button onClick={onExecuteImport}  variant="primary">确认导入</Button>
              </div>
            </>
          )}
          {phase === 'importing' && (
            <div className="w-full text-center text-sm text-slate-400">请勿关闭窗口</div>
          )}
          {phase === 'done' && (
            <>
              <div>
                {!showPresetInput ? (
                  <Button onClick={() => setShowPresetInput(true)}
                     variant="ghost" size="sm" className="text-primary-600">
                    保存此映射为预设
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text" value={presetName}
                      onChange={e => setPresetName(e.target.value)}
                      placeholder="预设名称，如：蜀道HR格式"
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm w-48"
                      autoFocus
                    />
                    <Button
                      onClick={() => {
                        if (presetName.trim() && onSavePreset(presetName.trim())) {
                          setShowPresetInput(false)
                          setPresetName('')
                        }
                      }}
                      
                     variant="primary" className="text-sm">保存</Button>
                    <button onClick={() => setShowPresetInput(false)}
                      className="px-3 py-1.5 text-slate-500 hover:text-slate-700 text-sm">取消</button>
                  </div>
                )}
              </div>
              <Button onClick={onClose}  variant="secondary">关闭</Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
