import { useState } from 'react'
import type { CostLedgerBatch } from '@/types'

interface Props {
  batches: CostLedgerBatch[]
  currentBatchId: number
  onChangeBatch: (batchId: number) => void
  onCreateBatch: (name: string) => Promise<any>
  onCopyBatch: (sourceBatchId: number, name: string) => Promise<any>
  onRenameBatch: (batchId: number, name: string) => Promise<boolean>
  onDeleteBatch: (batchId: number) => Promise<boolean>
  onCompare: () => void
  onImport: () => void
}

export function CostLedgerBatchBar({ batches, currentBatchId, onChangeBatch, onCreateBatch, onCopyBatch, onRenameBatch, onDeleteBatch, onCompare, onImport }: Props) {
  const [showNewInput, setShowNewInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    const newBatch = await onCreateBatch(name)
    if (newBatch) {
      setShowNewInput(false)
      setNewName('')
      onChangeBatch(newBatch.id)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Version selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">版本</span>
        {renaming ? (
          <div className="flex items-center gap-1">
            <input autoFocus value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter' && renameValue.trim()) {
                  await onRenameBatch(currentBatchId, renameValue.trim())
                  setRenaming(false)
                }
                if (e.key === 'Escape') setRenaming(false)
              }}
              onBlur={async () => {
                if (renameValue.trim()) await onRenameBatch(currentBatchId, renameValue.trim())
                setRenaming(false)
              }}
              className="w-28 px-2 py-1 border border-blue-400 rounded-lg text-sm bg-white" />
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <select
              value={currentBatchId}
              onChange={e => onChangeBatch(parseInt(e.target.value))}
              className="px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button onClick={() => { const cur = batches.find(b => b.id === currentBatchId); setRenameValue(cur?.name || ''); setRenaming(true) }}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="重命名版本">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* New batch */}
      {showNewInput ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setShowNewInput(false); setNewName('') } }}
            placeholder="版本名称"
            className="w-36 px-2 py-1 border border-slate-300 rounded-lg text-sm"
          />
          <button onClick={handleCreate} className="btn btn-primary px-2 py-1 text-xs">确定</button>
          <button onClick={() => { setShowNewInput(false); setNewName('') }} className="btn btn-secondary btn-sm">取消</button>
        </div>
      ) : (
        <button onClick={() => setShowNewInput(true)}
          className="btn btn-secondary btn-sm"
        >+ 新建版本</button>
      )}

      {/* Import & Compare */}
      <button onClick={onImport}
        className="px-3 py-1 text-xs border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50"
      >导入 Excel</button>
      <button onClick={onCompare}
        disabled={batches.length < 2}
        className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-40"
      >对比版本</button>

      {/* Copy version */}
      <button onClick={async () => {
        const cur = batches.find(b => b.id === currentBatchId)
        const name = cur ? `${cur.name}（副本）` : '副本'
        const newBatch = await onCopyBatch(currentBatchId, name)
        if (newBatch) onChangeBatch(newBatch.id)
      }}
        className="px-3 py-1 text-xs border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
        title="复制当前版本数据到新版本"
      >复制版本</button>

      {/* Delete version (初始版不能删) */}
      {currentBatchId !== 0 && (
        <>
          {confirmDelete === currentBatchId ? (
            <div className="flex items-center gap-1 bg-red-50 px-2 py-1 rounded-lg border border-red-200">
              <span className="text-xs text-red-600 whitespace-nowrap">确定删除此版本？数据不可恢复</span>
              <button onClick={async () => {
                const ok = await onDeleteBatch(currentBatchId)
                if (ok) { onChangeBatch(0); setConfirmDelete(null) }
              }} className="btn btn-danger btn-sm">确认删除</button>
              <button onClick={() => setConfirmDelete(null)} className="btn btn-secondary btn-sm">取消</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(currentBatchId)}
              className="btn btn-ghost btn-sm text-red-500 hover:text-red-700"
              title="删除此版本及数据"
            >
              <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          )}
        </>
      )}
    </div>
  )
}
