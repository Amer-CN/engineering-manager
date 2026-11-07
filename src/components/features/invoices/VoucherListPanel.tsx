/**
 * VoucherListPanel.tsx - 记账凭证列表（T6c/T6d/T7a/T7b）
 *
 * 按期间筛选展示凭证；草稿可「过账」「删除」，已过账可「反过账」（原因必填）。
 * 过账/反过账/期初余额权限与后端一致（vouchers:approve）；金额库内分、展示元。
 */
import React, { useMemo, useState } from 'react'
import type { Voucher } from '@/types/electron'
import { formatMoney } from '@/utils/format'
import { DataTable, type Column } from '@/components/DataTable'
import { Select } from '@/components/ui/Select/Select'
import { Button } from '../../ui/Button'
import { usePermission } from '@/hooks/usePermission'
import { useConfirm } from '@/hooks/useConfirm'
import { useToastStore } from '@/store/toastStore'
import { useDeleteVoucher, usePostVoucher, useVoucherSummary, useVouchers } from '@/hooks/data/useVouchers'
import { VoucherDetailDrawer } from './VoucherDetailDrawer'
import { VoucherUnpostDrawer } from './VoucherUnpostDrawer'
import { VoucherOpeningBalanceDrawer } from './VoucherOpeningBalanceDrawer'
import { exportVoucherCsv, printVoucherList } from './voucherPrintExport'

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  posted: '已过账',
}

function StatusBadge({ status }: { status: string }) {
  const posted = status === 'posted'
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs"
      style={posted
        ? { background: 'var(--success-soft)', color: 'var(--success)' }
        : { background: 'var(--panel-2)', color: 'var(--muted)' }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

export const VoucherListPanel: React.FC = () => {
  const { can } = usePermission()
  const { confirm, ConfirmDialog } = useConfirm()
  const showToast = useToastStore(s => s.showToast)

  const [period, setPeriod] = useState('')
  const [detailVoucher, setDetailVoucher] = useState<Voucher | null>(null)
  const [unpostTarget, setUnpostTarget] = useState<Voucher | null>(null)
  const [openingOpen, setOpeningOpen] = useState(false)
  const { data: vouchersData, isLoading, error } = useVouchers()
  const { data: summary } = useVoucherSummary(period || undefined)
  const postVoucher = usePostVoucher()
  const deleteVoucher = useDeleteVoucher()

  const currentPeriod = useMemo(() => {
    if (period) return period
    const now = new Date()
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [period])

  const vouchers = vouchersData ?? []

  const periodOptions = useMemo(() => {
    const periods: string[] = Array.from(new Set<string>(vouchers.map((v: Voucher) => v.period))).sort().reverse()
    return [
      { label: '全部期间', value: '' },
      ...periods.map((p: string) => ({ label: `${p.slice(0, 4)}-${p.slice(4)}`, value: p })),
    ]
  }, [vouchers])

  const rows: Voucher[] = period ? vouchers.filter((v: Voucher) => v.period === period) : vouchers

  const handlePost = async (voucher: Voucher) => {
    const ok = await confirm({
      title: '确认过账',
      content: `过账后不可撤销，且分录不可修改。确定过账 ${voucher.voucherNo}？`,
      confirmText: '过账',
      confirmVariant: 'primary',
    })
    if (!ok) return
    try {
      const result = await postVoucher.mutateAsync(voucher.id)
      showToast(`已过账 ${result?.voucherNo ?? voucher.voucherNo}`, 'success')
    } catch (e) {
      showToast((e as Error).message || '过账失败', 'error')
    }
  }

  const handleDelete = async (voucher: Voucher) => {
    const ok = await confirm({
      title: '删除凭证草稿',
      content: `确定删除凭证 ${voucher.voucherNo}？删除后不可恢复。`,
      confirmText: '删除',
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      await deleteVoucher.mutateAsync(voucher.id)
      showToast(`已删除 ${voucher.voucherNo}`, 'success')
    } catch (e) {
      showToast((e as Error).message || '删除凭证失败', 'error')
    }
  }

  const columns: Column<Voucher>[] = [
    {
      key: 'voucherNo',
      title: '凭证号',
      sortable: true,
      sorter: (a, b) => a.voucherNo.localeCompare(b.voucherNo),
      render: (v) => (
        <span className="font-mono font-medium" style={{ color: 'var(--fg)' }}>{v.voucherNo}</span>
      ),
    },
    {
      key: 'voucherDate',
      title: '凭证日期',
      sortable: true,
      sorter: (a, b) => a.voucherDate.localeCompare(b.voucherDate),
      render: (v) => (
        <div className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>
          {v.voucherDate}
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{v.period.slice(0, 4)}-{v.period.slice(4)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      render: (v) => <StatusBadge status={v.status} />,
    },
    {
      key: 'templateCode',
      title: '模板',
      render: (v) => (
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{v.templateCode}</span>
      ),
    },
    {
      key: 'totalDebit',
      title: '借方合计',
      align: 'right',
      sortable: true,
      sorter: (a, b) => a.totalDebit - b.totalDebit,
      render: (v) => (
        <span className="font-mono tabular-nums" style={{ color: 'var(--fg)' }}>¥{formatMoney(v.totalDebit)}</span>
      ),
    },
    {
      key: 'totalCredit',
      title: '贷方合计',
      align: 'right',
      sortable: true,
      sorter: (a, b) => a.totalCredit - b.totalCredit,
      render: (v) => (
        <span className="font-mono tabular-nums" style={{ color: 'var(--fg)' }}>¥{formatMoney(v.totalCredit)}</span>
      ),
    },
    {
      key: 'entries',
      title: '分录',
      align: 'right',
      render: (v) => (
        <span className="text-xs" style={{ color: 'var(--muted)' }}>{v.entries.length} 行</span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      align: 'right',
      width: '320px',
      render: (v) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDetailVoucher(v)}>
            详情
          </Button>
          {v.status === 'posted' ? (
            <>
              {can('vouchers:approve') && (
                <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => setUnpostTarget(v)}>
                  反过账
                </Button>
              )}
              <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--muted)' }}>
                {v.postedAt ?? ''}
              </span>
            </>
          ) : (
            <>
              {can('vouchers:approve') && (
                <Button size="sm" variant="primary" onClick={() => void handlePost(v)} loading={postVoucher.isPending}>
                  过账
                </Button>
              )}
              {can('vouchers:delete') && (
                <Button size="sm" variant="danger" onClick={() => void handleDelete(v)} loading={deleteVoucher.isPending}>
                  删除
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  if (error) {
    return (
      <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
        获取凭证失败：{(error as Error).message}
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-44 shrink-0">
          <Select
            options={periodOptions}
            value={period}
            onChange={(value) => setPeriod(String(value))}
            placeholder="全部期间"
          />
        </div>
        <span className="text-xs whitespace-nowrap shrink-0" style={{ color: 'var(--muted)' }}>共 {rows.length} 张凭证</span>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {can('vouchers:approve') && (
            <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => setOpeningOpen(true)}>
              期初余额
            </Button>
          )}
          <Button
            size="sm"
            variant="secondary"
            className="whitespace-nowrap"
            disabled={rows.length === 0}
            onClick={() => exportVoucherCsv(rows, period || undefined)}
          >
            导出 CSV
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="whitespace-nowrap"
            disabled={rows.length === 0}
            onClick={() => printVoucherList(rows, period ? `${period.slice(0, 4)}-${period.slice(4)}` : '全部期间')}
          >
            打印
          </Button>
        </div>
      </div>

      {summary && (
        <div className="flex flex-wrap items-center gap-4 mb-3 text-xs" style={{ color: 'var(--muted)' }}>
          <span>凭证 <span className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>{summary.totalCount}</span> 张</span>
          <span>草稿 <span className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>{summary.draftCount}</span></span>
          <span>已过账 <span className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>{summary.postedCount}</span></span>
          <span>借方合计 <span className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>¥{formatMoney(summary.totalDebit)}</span></span>
          <span>贷方合计 <span className="font-mono tabular-nums" style={{ color: 'var(--fg-2)' }}>¥{formatMoney(summary.totalCredit)}</span></span>
          {!summary.balanced && <span style={{ color: 'var(--danger)' }}>借贷不平衡</span>}
        </div>
      )}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(v) => String(v.id)}
        loading={isLoading}
        emptyText="暂无凭证（在发票行「凭证预览」中生成草稿后在此过账）"
      />

      {ConfirmDialog}
      <VoucherDetailDrawer voucher={detailVoucher} onClose={() => setDetailVoucher(null)} />
      <VoucherUnpostDrawer voucher={unpostTarget} onClose={() => setUnpostTarget(null)} />
      <VoucherOpeningBalanceDrawer
        open={openingOpen}
        period={currentPeriod}
        onClose={() => setOpeningOpen(false)}
      />
    </div>
  )
}