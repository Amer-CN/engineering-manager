import { motion } from 'framer-motion'
import { DataTable, type Column } from '@/components/DataTable'
import { Icon } from '../../ui/Icon'
import { Spinner } from '../../ui/Loading/Loading'
import {
  WORKER_IMPORT_FIELDS, type ImportState, type ImportProgress, type ImportResult,
} from './useWorkerImport'
import { getConfidenceClass, getConfidenceIcon, validateRow } from './workerImportHelpers'

interface MappingPhaseProps {
  importState: ImportState
  onSwitchSheet?: (name: string) => void
  onSetHeaderRow?: (rowIdx: number) => void
  onSetMapping: (key: string, colIdx: number) => void
  onGetConfidence: (key: string) => number
}

export function MappingPhase({
  importState, onSwitchSheet, onSetHeaderRow, onSetMapping, onGetConfidence,
}: MappingPhaseProps) {
  const previewColumns: Column<any>[] = [
    {
      key: '_status', title: '', width: '32px',
      render: (_row: any, index: number) => {
        const row = importState.previewRows[index]
        if (!row) return null
        const { valid, errors } = validateRow(row, importState.mapping)
        return valid
          ? <Icon name="Check" size={12} className="text-emerald-500" />
          : <span title={errors.join(', ')}><Icon name="AlertTriangle" size={12} className="text-red-400" /></span>
      }
    },
    ...importState.headers.map((h, i) => ({
      key: `col_${i}`,
      title: h || `列${i + 1}`,
      render: (_row: any, index: number) => {
        const row = importState.previewRows[index]
        if (!row) return null
        const val = row[i]
        return <span className="text-slate-700 whitespace-nowrap">{val !== undefined && val !== null ? String(val) : ''}</span>
      }
    }))
  ]

  return (
    <>
      <div className="flex items-center gap-6 flex-wrap">
        {importState.sheetNames.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-700">工作表：</label>
            <select value={importState.activeSheet} onChange={e => onSwitchSheet?.(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
              {importState.sheetNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700">表头行：</label>
          <select value={importState.headerRow}
            onChange={e => onSetHeaderRow?.(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white">
            {Array.from({ length: 5 }, (_, i) => <option key={i} value={i}>第 {i + 1} 行</option>)}
          </select>
        </div>
        {importState.detectedPreset && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
            <Icon name="Zap" size={14} />
            检测到: {importState.detectedPreset}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          列映射（选择每列对应的字段）
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {WORKER_IMPORT_FIELDS.map(f => (
            <div key={f.key}>
              <label className="text-xs text-slate-500 block mb-1">
                {f.required && <span className="text-red-400 mr-0.5">*</span>}
                {f.label}
                {getConfidenceIcon(importState, f.key, onGetConfidence) && (
                  <span className="ml-1 inline-flex">{getConfidenceIcon(importState, f.key, onGetConfidence)}</span>
                )}
              </label>
              <select
                value={importState.mapping[f.key]}
                onChange={e => onSetMapping(f.key, parseInt(e.target.value))}
                className={`w-full px-2 py-1.5 border rounded text-sm ${getConfidenceClass(importState, f.key, onGetConfidence)}`}
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

      <div>
        <label className="text-sm font-medium text-slate-700 block mb-2">
          数据预览（前 {Math.min(10, importState.previewRows.length)} 行，共 {importState.allRows.length} 行）
        </label>
        <div className="border border-slate-200 rounded-xl overflow-hidden" style={{maxHeight:240,overflowY:'auto'}}>
          <DataTable
            data={importState.previewRows}
            columns={previewColumns}
            rowKey={(item: any) => JSON.stringify(item)}
            pagination={false}
            showContainer={false}
            stickyHeader={true}
          />
        </div>
      </div>
    </>
  )
}

export function ImportingPhase({ progress }: { progress: ImportProgress }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Spinner size="lg" />
      <h3 className="text-lg font-semibold text-slate-800">正在导入...</h3>
      <div className="w-full max-w-md">
        <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
          <motion.div
            className="bg-primary-600 h-full rounded-full"
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
  )
}

export function DonePhase({ result }: { result: ImportResult }) {
  return (
    <div className="flex flex-col items-center py-6 space-y-4">
      {result.failed === 0 && result.skipped === 0 ? (
        <>
          <Icon name="CheckCircle" size={48} className="text-emerald-500" />
          <h3 className="text-lg font-semibold text-slate-800">导入完成</h3>
        </>
      ) : (
        <>
          <Icon name="AlertTriangle" size={48} className="text-amber-500" />
          <h3 className="text-lg font-semibold text-slate-800">导入完成（部分成功）</h3>
        </>
      )}
      <div className="grid grid-cols-4 gap-4 w-full max-w-lg">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{result.success}</div>
          <div className="text-xs text-slate-500 mt-1">新增</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{result.updated}</div>
          <div className="text-xs text-slate-500 mt-1">更新</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-amber-500">{result.skipped}</div>
          <div className="text-xs text-slate-500 mt-1">跳过</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-500">{result.failed}</div>
          <div className="text-xs text-slate-500 mt-1">失败</div>
        </div>
      </div>
      {result.warnings && result.warnings.length > 0 && (
        <details className="w-full max-w-md" open>
          <summary className="text-sm text-amber-600 cursor-pointer hover:text-amber-700 font-medium">
            警告（{result.warnings.length} 条）
          </summary>
          <div className="mt-2 border border-amber-200 rounded-lg" style={{maxHeight:160,overflowY:'auto'}}>
            <DataTable
              data={result.warnings.map((w, i) => ({ ...w, _idx: i }))}
              columns={[
                { key: 'row', title: '行号', width: '60px' },
                { key: 'name', title: '姓名', width: '80px' },
                { key: 'message', title: '说明', render: (item: any) => <span className="text-amber-600">{item.message}</span> },
              ]}
              rowKey="_idx"
              pagination={false}
              showContainer={false}
            />
          </div>
        </details>
      )}
      {result.failures.length > 0 && (
        <details className="w-full max-w-md">
          <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
            失败详情（{result.failures.length} 条）
          </summary>
          <div className="mt-2 border border-slate-200 rounded-lg" style={{maxHeight:160,overflowY:'auto'}}>
            <DataTable
              data={result.failures.map((f, i) => ({ ...f, _idx: i }))}
              columns={[
                { key: 'row', title: '行号', width: '60px' },
                { key: 'reason', title: '原因', render: (item: any) => <span className="text-red-500">{item.reason}</span> },
              ]}
              rowKey="_idx"
              pagination={false}
              showContainer={false}
            />
          </div>
        </details>
      )}
    </div>
  )
}
