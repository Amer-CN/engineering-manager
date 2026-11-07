/**
 * VoucherUnpostDrawer.tsx - 反过账原因录入（T7a，自包含）。
 *
 * 反过账是高风险动作：原因必填（≤200）、成功后回到草稿；原因随审计落库。
 */
import React, { useState } from 'react'
import type { Voucher } from '@/types/electron'
import { Drawer } from '../../ui/Drawer'
import { Button } from '../../ui/Button'
import { useToastStore } from '@/store/toastStore'
import { useUnpostVoucher } from '@/hooks/data/useVouchers'

interface VoucherUnpostDrawerProps {
  voucher: Voucher | null
  onClose: () => void
}

export const VoucherUnpostDrawer: React.FC<VoucherUnpostDrawerProps> = ({ voucher, onClose }) => {
  const showToast = useToastStore(s => s.showToast)
  const unpostVoucher = useUnpostVoucher()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const close = () => {
    setReason('')
    setError(null)
    onClose()
  }

  const submit = async () => {
    if (!voucher) return
    const trimmed = reason.trim()
    if (!trimmed) {
      setError('请填写反过账原因')
      return
    }
    try {
      await unpostVoucher.mutateAsync({ id: voucher.id, reason: trimmed })
      showToast(`已反过账 ${voucher.voucherNo}`, 'success')
      setReason('')
      setError(null)
      onClose()
    } catch (e) {
      setError((e as Error).message || '反过账失败')
    }
  }

  return (
    <Drawer
      open={!!voucher}
      onClose={close}
      icon="FileText"
      width={420}
      title={`反过账 - ${voucher?.voucherNo ?? ''}`}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" onClick={close}>取消</Button>
          <Button
            variant="danger"
            loading={unpostVoucher.isPending}
            disabled={!reason.trim()}
            onClick={() => void submit()}
          >
            确认反过账
          </Button>
        </div>
      }
    >
      <div className="px-6 py-4 space-y-3">
        <p className="text-sm" style={{ color: 'var(--fg-2)' }}>
          反过账后凭证回到草稿：分录保留但可修改/删除；操作会记入审计日志。
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          maxLength={200}
          rows={3}
          placeholder="请填写反过账原因（必填，≤200 字）"
          className="w-full rounded-lg px-3 py-2 text-sm resize-none"
          style={{ background: 'var(--card)', color: 'var(--fg)', border: '1px solid var(--border)' }}
        />
        <div className="flex items-center justify-between text-xs" style={{ color: 'var(--muted)' }}>
          <span>{error ? <span style={{ color: 'var(--danger)' }}>{error}</span> : '原因会写入审计日志'}</span>
          <span className="font-mono tabular-nums">{reason.length}/200</span>
        </div>
      </div>
    </Drawer>
  )
}