/**
 * 步骤一：选择文件
 * Props 从 CostLedgerImportModal 主组件传入
 */
import React from 'react'
import { Icon } from '@/components/ui/Icon'

interface Props {
  selectedBatch: number
  onBatchChange: (id: number) => void
  batches: { id: number; name: string }[] | undefined
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  error: string | null
}

export function ImportFileStep({ selectedBatch, onBatchChange, batches, onFileChange, error }: Props) {
  return (
  <div className="space-y-4">
  {batches && batches.length > 0 && (
  <div className="flex items-center gap-2 justify-center">
  <span className="text-sm text-[color:var(--muted)]">导入到版本：</span>
  <select
  value={selectedBatch}
  onChange={e => onBatchChange(parseInt(e.target.value))}
  className="px-3 py-1.5 border border-[color:var(--border)] rounded-lg text-sm bg-[color:var(--card)]"
  >
  {batches.map(b => (
  <option key={b.id} value={b.id}>
  {b.name}{b.id === 0 ? '（初始版）' : ''}
  </option>
  ))}
  </select>
  {selectedBatch === 0 && (
  <span className="text-xs text-warning-600 bg-warning-50 px-2 py-1 rounded">
  建议先建新版本再导入
  </span>
  )}
  </div>
  )}
  <div className="border-2 border-dashed border-[color:var(--border)] rounded-xl p-10 text-center hover:border-[color:var(--accent)] transition-colors">
  <Icon name="FileSpreadsheet" size={48} className="mx-auto text-[color:var(--muted)] mb-3" />
  <p className="text-[color:var(--fg-2)] mb-2">选择 Excel 文件（.xlsx / .xls）</p>
  <p className="text-xs text-[color:var(--muted)] mb-4">财务导出的台账格式</p>
  <label className="inline-flex items-center gap-2 px-4 py-2 bg-[color:var(--accent)] text-[color:var(--on-accent)] rounded-lg cursor-pointer hover:opacity-90 transition-colors">
  <Icon name="Upload" size={16} />
  选择文件
  <input type="file" accept=".xlsx,.xls" onChange={onFileChange} className="hidden" />
  </label>
  </div>
  </div>
  )
}
