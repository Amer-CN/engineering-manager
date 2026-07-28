import React from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Card } from '@/components/ui/Card'

export function PreviewModal({ data, type, title, onClose }: { data: string; type: 'image' | 'pdf'; title: string; onClose: () => void }) {
  return (
  <Modal isOpen onClose={onClose} title={title} size="full">
  <div className="bg-[color:var(--panel-2)] rounded-lg p-4" style={{ minHeight: '70vh' }}>
  {type === 'image' ? (
  <img src={data} alt={title} className="max-w-full h-auto mx-auto rounded-lg shadow-lg" loading="lazy" />
  ) : (
  <embed src={data} type="application/pdf" className="w-full h-full rounded-lg" />
  )}
  </div>
  </Modal>
  )
}

export function FilePreviewItem({ label, file, fileType, onPreview }: { label: string; file: string; fileType?: string; onPreview: () => void }) {
  if (!file) return null
  return (<div className="flex items-center gap-2"><span className="text-sm text-[color:var(--fg-2)]">{label}:</span><button onClick={onPreview} className="text-[color:var(--accent)] hover:opacity-70 text-sm underline">{fileType === 'pdf' ? '查看PDF' : '查看图片'}</button></div>)
}

export function InfoItem({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value?: string | number | null; highlight?: boolean }) {
  if (!value) return null
  return (<div className="flex items-start"><span className="text-[color:var(--muted)] mr-2">{icon}</span><div className="flex-1"><span className="text-sm text-[color:var(--muted)]">{label}: </span><span className={`text-sm ${highlight ? 'text-success-600 font-medium' : 'text-[color:var(--fg)]'}`}>{value}</span></div></div>)
}

export function Tag({ label, variant = 'success' }: { label: string; variant?: 'success' | 'warning' | 'info' | 'danger' }) {
  const v = { success: 'bg-success-100 text-success-700', warning: 'bg-warning-100 text-warning-700', info: 'bg-[color:var(--accent-soft)] text-[color:var(--accent)]', danger: 'bg-danger-100 text-danger-700' }
  return <span className={`px-2 py-1 rounded text-xs ${v[variant]}`}>{label}</span>
}

export function IdCardImages({ idCardFront, idCardBack, fileUrls, onPreview }: {
  idCardFront?: string; idCardBack?: string; fileUrls: Record<string, string>
  onPreview: (data: string, type: 'image' | 'pdf', title: string) => void
}) {
  if (!idCardFront && !idCardBack) return null
  return (
  <div className="mt-4 pt-4 border-t border-[color:var(--border)]">
  <p className="text-sm text-[color:var(--fg-2)] mb-3">身份证图片</p>
  <div className="grid grid-cols-2 gap-4">
  {idCardFront && fileUrls.idCardFront && (
  <div className="text-center"><p className="text-xs text-[color:var(--muted)] mb-2">人像面</p>
  <div className="border border-[color:var(--border)] rounded-lg p-2 cursor-pointer hover:border-[color:var(--accent)] transition-colors" onClick={() => onPreview(fileUrls.idCardFront!, 'image', '身份证人像面')}>
  <img src={fileUrls.idCardFront} alt="人像面" className="max-h-32 mx-auto rounded" loading="lazy" /></div></div>)}
  {idCardBack && fileUrls.idCardBack && (
  <div className="text-center"><p className="text-xs text-[color:var(--muted)] mb-2">国徽面</p>
  <div className="border border-[color:var(--border)] rounded-lg p-2 cursor-pointer hover:border-[color:var(--accent)] transition-colors" onClick={() => onPreview(fileUrls.idCardBack!, 'image', '身份证国徽面')}>
  <img src={fileUrls.idCardBack} alt="国徽面" className="max-h-32 mx-auto rounded" loading="lazy" /></div></div>)}
  </div>
  </div>
  )
}

export function ManagerSalaryCard({ member }: { member: any }) {
  if (member.baseSalary === undefined) return null
  const earnings = (member.baseSalary || 0) + (member.otherAllowances || 0)
  const deductions = (member.socialSecurityPersonal || 0) + (member.housingFund || 0)
  const netPay = earnings - deductions
  return (
  <Card className="border border-[color:var(--border)] p-6 mb-6">
  {/* S23 Stitch: KPI header */}
  <div className="flex justify-between items-end border-b border-[color:var(--border)] pb-4 mb-6">
    <div>
      <div className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] mb-1">当前月度税前总薪酬</div>
      <div className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">
        <span className="text-base font-semibold text-[color:var(--fg-2)] mr-1">¥</span>{earnings.toLocaleString()}
      </div>
    </div>
  </div>
  {/* S23 Stitch: 2-col earnings / deductions */}
  <div className="grid grid-cols-2 gap-6">
    {/* Earnings */}
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] border-b border-[color:var(--border)] pb-1.5 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-success-500" /> 应发项目
      </h4>
      <div className="flex flex-col bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-4 gap-2.5">
        <div className="flex justify-between items-center">
          <span className="text-sm text-[color:var(--fg-2)]">基本工资</span>
          <span className="font-mono text-sm tabular-nums text-[color:var(--fg)] min-w-[100px] text-right">¥ {(member.baseSalary || 0).toLocaleString()}</span>
        </div>
        {member.otherAllowances !== undefined && member.otherAllowances > 0 && (
        <>
        <div className="w-full h-px bg-[color:var(--border)]" style={{ borderTop: '1px dashed var(--border)' }} />
        <div className="flex justify-between items-center">
          <span className="text-sm text-[color:var(--fg-2)]">其他补贴</span>
          <span className="font-mono text-sm tabular-nums text-[color:var(--fg)] min-w-[100px] text-right">¥ {(member.otherAllowances || 0).toLocaleString()}</span>
        </div>
        </>
        )}
        <div className="mt-1 pt-2.5 border-t border-[color:var(--border)] flex justify-between items-center">
          <span className="text-sm font-semibold text-[color:var(--fg)]">小计</span>
          <span className="font-mono text-sm tabular-nums font-bold text-[color:var(--fg)] min-w-[100px] text-right">¥ {earnings.toLocaleString()}</span>
        </div>
      </div>
    </div>
    {/* Deductions */}
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] border-b border-[color:var(--border)] pb-1.5 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-danger-500" /> 扣减项目
      </h4>
      <div className="flex flex-col bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-4 gap-2.5">
        {member.socialSecurityPersonal !== undefined && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-[color:var(--fg-2)]">社保（个人）</span>
          <span className="font-mono text-sm tabular-nums text-[color:var(--fg)] min-w-[100px] text-right">- ¥ {(member.socialSecurityPersonal || 0).toLocaleString()}</span>
        </div>
        )}
        {member.housingFund !== undefined && (
        <>
        <div className="w-full h-px bg-[color:var(--border)]" style={{ borderTop: '1px dashed var(--border)' }} />
        <div className="flex justify-between items-center">
          <span className="text-sm text-[color:var(--fg-2)]">住房公积金</span>
          <span className="font-mono text-sm tabular-nums text-[color:var(--fg)] min-w-[100px] text-right">- ¥ {(member.housingFund || 0).toLocaleString()}</span>
        </div>
        </>
        )}
        <div className="mt-1 pt-2.5 border-t border-[color:var(--border)] flex justify-between items-center">
          <span className="text-sm font-semibold text-[color:var(--fg)]">小计</span>
          <span className="font-mono text-sm tabular-nums font-bold text-danger-600 min-w-[100px] text-right">- ¥ {deductions.toLocaleString()}</span>
        </div>
      </div>
    </div>
  </div>
  {/* S23 Stitch: Net pay footer */}
  <div className="mt-6 bg-[color:var(--panel-2)] border border-[color:var(--border)] rounded-lg p-4 flex justify-between items-center">
    <div>
      <span className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] block mb-0.5">实发薪资</span>
      <span className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">
        <span className="text-base font-semibold text-[color:var(--fg-2)] mr-1">¥</span>{netPay.toLocaleString()}
      </span>
    </div>
  </div>
  </Card>
  )
}
