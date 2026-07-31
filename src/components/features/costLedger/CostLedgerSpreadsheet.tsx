/**
 * 成本台账 Univer 真电子表格视图
 * Shadow DOM 隔离 Univer 全局 CSS，React.lazy 动态导入，vendor-univer chunk
 * 列映射：凭证号/日期/方向/分类/金额(分→元)/对方单位/渠道/摘要/备注
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/services/api-client'
import { useToastStore } from '@/store/toastStore'
import { Icon } from '@/components/ui/Icon'
import { exportCostLedgerList } from './printExport'
import { UniverMount, readUniverEntries } from './univerEngine'
import type { CostLedgerEntry, CostLedgerCategory } from '@/types'

// ── 主组件 ─────────────────────────────────────────────

interface CostLedgerSpreadsheetProps {
  projectId: number
  batchId: number
  categories?: CostLedgerCategory[] | null
  onClose: () => void
}

export default function CostLedgerSpreadsheet({
  projectId, batchId, categories, onClose,
}: CostLedgerSpreadsheetProps) {
  const showToast = useToastStore(state => state.showToast)
  const [entries, setEntries] = useState<CostLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const univerInstanceRef = useRef<any>(null)

  // 拉取 sheet 数据
  const load = useCallback(async () => {
    if (!batchId) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<CostLedgerEntry[]>(
        `/api/cost-ledger/${batchId}/sheet`
      )
      if (res.success && res.data) {
        setEntries(res.data)
      } else {
        setError(res.error || '加载台账数据失败')
        setEntries([])
      }
    } catch (err) {
      setError(String(err))
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [batchId])

  useEffect(() => { load() }, [load])

  // 保存（显式提交，从 Univer 实例回读编辑数据）
  const handleSave = async () => {
    if (!batchId || entries.length === 0) return
    setSaving(true)
    try {
      // 从 Univer 实例读取当前编辑状态（包含用户修改 + 新增行）
      const currentEntries = univerInstanceRef.current
        ? readUniverEntries(univerInstanceRef.current, entries)
        : entries

      // 构建 POST 载荷：金额已为分（INTEGER）
      const sheetPayload = currentEntries.map(e => ({
        id: e.id || null,
        projectId,
        batchId,
        voucherNo: e.voucherNo || null,
        date: e.date || null,
        direction: e.direction || 'expense',
        category: e.category || null,
        amount: typeof e.amount === 'number' ? e.amount : 0, // 金额保持分
        counterparty: e.counterparty || null,
        channel: e.channel || null,
        summary: e.summary || null,
        notes: e.notes || null,
      }))
      const res = await apiClient.post<{ count: number }>(
        `/api/cost-ledger/${batchId}/sheet`,
        { entries: sheetPayload }
      )
      if (res.success) {
        showToast(`已保存 ${res.data?.count ?? currentEntries.length} 条记录`, 'success')
      } else {
        showToast(res.error || '保存失败', 'error')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      showToast('保存失败: ' + msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  // 导出 Excel（复用现有 xlsx 能力）
  const handleExport = () => {
    exportCostLedgerList(entries, categories, 'level2')
  }

  const handleUniverError = useCallback((err: string) => {
    setError('电子表格引擎加载失败: ' + err)
  }, [])

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--bg)' }}>
      {/* 工具栏 */}
      <div
        className="flex items-center gap-3 px-4 py-2.5"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--card)' }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors"
          style={{ color: 'var(--fg-2)' }}
        >
          <Icon name="ArrowLeft" size={15} />
          <span>返回列表</span>
        </button>

        <span
          className="h-5 w-px"
          style={{ background: 'var(--border)' }}
        />

        <span className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
          电子表格视图
        </span>
        <span
          className="rounded px-1.5 py-0.5 text-caption font-semibold"
          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
        >
          Beta
        </span>

        <div className="flex-1" />

        <button
          onClick={handleExport}
          disabled={loading || entries.length === 0}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors disabled:opacity-40"
          style={{ border: '1px solid var(--border)', color: 'var(--fg-2)' }}
        >
          <Icon name="Download" size={14} />
          <span>导出 Excel</span>
        </button>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
          style={{ background: 'var(--accent)', color: 'var(--on-accent)' }}
        >
          <Icon name="Save" size={14} />
          <span>{saving ? '保存中…' : '保存'}</span>
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 min-h-0 relative">
        {loading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: 'var(--bg)' }}
          >
            <div className="flex flex-col items-center gap-3">
              <div
                className="h-8 w-8 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
              />
              <span className="text-sm" style={{ color: 'var(--muted)' }}>
                加载电子表格引擎…
              </span>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6">
            <span style={{ color: 'var(--warning)' }}><Icon name="AlertTriangle" size={32} /></span>
            <p className="text-sm" style={{ color: 'var(--fg-2)' }}>{error}</p>
            <button
              onClick={load}
              className="rounded-lg px-3 py-1.5 text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--accent)' }}
            >
              重试
            </button>
          </div>
        )}

        {!error && !loading && (
          <UniverMount entries={entries} onError={handleUniverError} univerRef={univerInstanceRef} />
        )}
      </div>
    </div>
  )
}
