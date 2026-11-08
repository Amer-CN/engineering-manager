/**
 * VoucherOpeningBalanceDrawer.tsx - 期初余额录入（T7b，自包含）。
 *
 * 按科目录入建账期初（元），保存前本地校验借贷平衡；后端再做一次分级平衡校验，
 * 保存为整期替换并写审计。金额展示元、库内分。
 */
import React, { useEffect, useState } from 'react'
import type { OpeningBalanceRow } from '@/types/electron'
import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import { formatMoney } from '@/utils/format'
import { useToastStore } from '@/store/toastStore'
import { useOpeningBalances, useSaveOpeningBalances } from '@/hooks/data/useVouchers'

interface VoucherOpeningBalanceDrawerProps {
  open: boolean
  /** YYYYMM（默认当前期间或列表筛选期间） */
  period: string
  onClose: () => void
}

export const VoucherOpeningBalanceDrawer: React.FC<VoucherOpeningBalanceDrawerProps> = ({ open, period, onClose }) => {
  const showToast = useToastStore(s => s.showToast)
  const { data } = useOpeningBalances(open ? period : null)
  const saveOpening = useSaveOpeningBalances()
  const [rows, setRows] = useState<OpeningBalanceRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !data?.rows) return
    setRows(data.rows.map((row: OpeningBalanceRow) => ({ ...row })))
    setError(null)
  }, [open, data])

  const totalDebit = rows.reduce((sum, row) => sum + (Number(row.debit) || 0), 0)
  const totalCredit = rows.reduce((sum, row) => sum + (Number(row.credit) || 0), 0)
  const balanced = Math.abs(totalDebit - totalCredit) < 0.005

  const updateRow = (index: number, patch: Partial<OpeningBalanceRow>) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const submit = async () => {
    if (!balanced) {
      setError('借贷不平衡，不能保存')
      return
    }
    const payload = rows
      .filter(row => row.accountCode.trim() !== '' || Number(row.debit) !== 0 || Number(row.credit) !== 0)
      .map(row => ({
        accountCode: row.accountCode.trim(),
        accountName: row.accountName.trim(),
        debit: Number(row.debit) || 0,
        credit: Number(row.credit) || 0,
      }))
    try {
      const saved = await saveOpening.mutateAsync({ period, rows: payload })
      showToast(
        `期初余额已保存（借 ${formatMoney(saved?.totalDebit ?? totalDebit)} / 贷 ${formatMoney(saved?.totalCredit ?? totalCredit)}）`,
        'success',
      )
      setError(null)
    } catch (e) {
      setError((e as Error).message || '保存期初余额失败')
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      icon="FileText"
      width={760}
      title={`期初余额 - ${period.slice(0, 4)}-${period.slice(4)}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            借 <span className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>¥{formatMoney(totalDebit)}</span>
            {' / '}贷 <span className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>¥{formatMoney(totalCredit)}</span>
            {!balanced && <span style={{ color: 'var(--danger)' }}> 借贷不平衡</span>}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose}>取消</Button>
            <Button variant="primary" loading={saveOpening.isPending} disabled={!balanced} onClick={() => void submit()}>
              保存期初余额
            </Button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-3">
        <div className="text-xs" style={{ color: 'var(--muted)' }}>
          按科目录入建账期初（借方/贷方二选一，金额为元）；保存为整期替换，并写入审计。
        </div>
        {error && <div className="text-sm" style={{ color: 'var(--danger)' }}>{error}</div>}
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--panel-2)', color: 'var(--muted)' }}>
                <th className="text-left px-3 py-2 font-medium">科目编码</th>
                <th className="text-left px-3 py-2 font-medium">科目名称</th>
                <th className="text-right px-3 py-2 font-medium w-32">借方(元)</th>
                <th className="text-right px-3 py-2 font-medium w-32">贷方(元)</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="px-3 py-1.5">
                    <input
                      value={row.accountCode}
                      onChange={e => updateRow(index, { accountCode: e.target.value })}
                      placeholder="1001"
                      className="w-full bg-transparent text-sm font-mono outline-none"
                      style={{ color: 'var(--fg)' }}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      value={row.accountName}
                      onChange={e => updateRow(index, { accountName: e.target.value })}
                      placeholder="库存现金"
                      className="w-full bg-transparent text-sm outline-none"
                      style={{ color: 'var(--fg-2)' }}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={Number(row.debit) || 0}
                      onChange={e => updateRow(index, { debit: Number(e.target.value) || 0 })}
                      className="w-full bg-transparent text-sm font-mono tabular-nums text-right outline-none"
                      style={{ color: 'var(--fg)' }}
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      value={Number(row.credit) || 0}
                      onChange={e => updateRow(index, { credit: Number(e.target.value) || 0 })}
                      className="w-full bg-transparent text-sm font-mono tabular-nums text-right outline-none"
                      style={{ color: 'var(--fg)' }}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Button size="sm" variant="ghost" className="whitespace-nowrap" onClick={() => setRows(prev => prev.filter((_, i) => i !== index))}>
                      删除
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm" style={{ color: 'var(--muted)' }}>
                    暂无期初余额，点「添加科目」开始录入
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRows(prev => [...prev, { accountCode: '', accountName: '', debit: 0, credit: 0 }])}
        >
          + 添加科目
        </Button>
      </div>
    </Drawer>
  )
}