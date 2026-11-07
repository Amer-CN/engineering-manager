/**
 * VoucherListPanel.tsx - 记账凭证列表（T6c）
 *
 * 按期间筛选展示凭证；草稿可「过账」「删除」，已过账只读（过账即终态）。
 * 过账/删除的权限与后端一致（vouchers:approve / vouchers:delete）；金额库内分、展示元。
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
import { useDeleteVoucher, usePostVoucher, useVouchers } from '@/hooks/data/useVouchers'

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
  const { data, isLoading, error } = useVouchers()
  const postVoucher = usePostVoucher()
  const deleteVoucher = useDeleteVoucher()

  const vouchers: Voucher[] = data ?? []

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
      width: '190px',
      render: (v) => (
        <div className="flex items-center justify-end gap-2">
          {v.status === 'posted' ? (
            <span className="text-xs font-mono tabular-nums" style={{ color: 'var(--muted)' }}>
              {v.postedAt ?? ''}
            </span>
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
        <Select
          options={periodOptions}
          value={period}
          onChange={(value) => setPeriod(String(value))}
          placeholder="全部期间"
          className="w-40"
        />
        <span className="text-xs" style={{ color: 'var(--muted)' }}>共 {rows.length} 张凭证</span>
      </div>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(v) => String(v.id)}
        loading={isLoading}
        emptyText="暂无凭证（在发票行「凭证预览」中生成草稿后在此过账）"
      />

      {ConfirmDialog}
    </div>
  )
}