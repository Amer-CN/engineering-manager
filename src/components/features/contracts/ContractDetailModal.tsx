// ContractDetailModal.tsx — S14 合同详情（Stitch Bedrock）
// 浏览型居中 Modal（S17 交互契约：浏览/预览用 Modal，写操作用 Drawer）
// 左主区：基本信息 / 金额与收付款记录 / 关联项目；右栏：状态时间线 / 附件 / 相关方

import { useMemo } from 'react'
import { Modal } from '../../ui/Modal/Modal'
import { Icon } from '../../ui/Icon'
import { SectionHeader } from '../../ui/SectionHeader'
import { Button } from '../../ui/Button'
import { formatMoney } from '../../../utils/format'
import type { Project, Partner, PaymentRecord } from '../../../types/electron'
import { getStatusLabel, getStatusColor, AGREEMENT_SUB_TYPE_LABELS, type Contract, type ContractType, type TypeConfig } from './contractConfig'
import type { AgreementContract } from '@/types'
import { paymentMethods } from '../../../data/regions'

interface ContractDetailModalProps {
  contract: Contract
  type: ContractType
  config: TypeConfig
  projects: Project[]
  partners: Partner[]
  paymentRecords: PaymentRecord[]
  onClose: () => void
  onEdit?: () => void
  onPreviewFile?: () => void
}

// S14 Stitch: 基本信息 label/value 单元
function InfoField({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] mb-1">{label}</p>
      <p className={`text-sm text-[color:var(--fg)] ${mono ? 'font-mono tabular-nums' : ''}`}>{value || '-'}</p>
    </div>
  )
}

export function ContractDetailModal({
  contract, type, config, projects, partners, paymentRecords,
  onClose, onEdit, onPreviewFile,
}: ContractDetailModalProps) {
  const project = projects.find(p => p.id === contract.projectId)
  const partner = partners.find(p => p.id === contract.partnerId)
  const isAgreement = type === 'agreement'

  // 真实收付款记录（关联本合同）
  const contractPayments = useMemo(() =>
    paymentRecords
      .filter(r => r.contractId === contract.id && (!config.paymentRecordType || r.type === config.paymentRecordType))
      .sort((a, b) => (b.recordDate || '').localeCompare(a.recordDate || '')),
  [paymentRecords, contract.id, config.paymentRecordType])
  const paidTotal = contractPayments.reduce((sum, r) => sum + (r.amount || 0), 0)
  const paidPercent = (contract.amount || 0) > 0 ? Math.min(100, Math.round(paidTotal / (contract.amount || 1) * 100)) : 0

  // S14 Stitch: 状态时间线 — 由真实日期字段推导的里程碑节点（倒序）
  const timeline = useMemo(() => {
    const nodes: { label: string; date: string; active?: boolean; desc?: string }[] = []
    nodes.push({ label: getStatusLabel(contract.status || 'draft'), date: '当前状态', active: true })
    if (contract.endDate) nodes.push({ label: '合同结束', date: contract.endDate })
    if (contract.startDate) nodes.push({ label: '开始执行', date: contract.startDate })
    if (contract.signedDate) nodes.push({ label: '签署合同', date: contract.signedDate, desc: '由双方代表签署' })
    return nodes
  }, [contract])

  const paymentMethodLabel = paymentMethods.find(m => m.value === (contract as { paymentMethod?: string }).paymentMethod)?.label
  const agreementTypeLabel = isAgreement
    ? AGREEMENT_SUB_TYPE_LABELS[(contract as AgreementContract).agreementType || 'cooperation']
    : undefined

  return (
    <Modal isOpen onClose={onClose} size="full"
      title={
        <div className="flex items-center gap-3">
          <span className="text-xl font-semibold text-[color:var(--fg)]">
            <Icon name="FileText" size={20} className="inline-block mr-1.5" />合同详情
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(contract.status || 'draft')}`}>
            {getStatusLabel(contract.status || 'draft')}
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[color:var(--panel-2)] text-[color:var(--fg-2)]">{config.label}</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          {onEdit && <Button onClick={onEdit} variant="primary" size="sm">编辑</Button>}
          <Button onClick={onClose} variant="secondary" size="sm">关闭</Button>
        </div>
      }
    >
      <div className="flex gap-6 items-start">
        {/* 左主区 */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* 基本信息 */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-5">
            <SectionHeader icon="Info" title="基本信息" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <InfoField label="合同编号" value={contract.contractNo} mono />
              <InfoField label="合同类型" value={isAgreement ? agreementTypeLabel : config.label} />
              <InfoField label="合同名称" value={contract.name} />
              <InfoField label="合同工期" value={contract.startDate || contract.endDate ? `${contract.startDate || '?'} 至 ${contract.endDate || '?'}` : undefined} mono />
              <InfoField label="签订日期" value={contract.signedDate} mono />
              {!isAgreement && <InfoField label="付款方式" value={paymentMethodLabel} />}
            </div>
          </div>

          {/* 金额与收付款记录（真实回款/付款数据，替代设计稿虚构付款计划） */}
          {!isAgreement && (
            <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-5">
              <SectionHeader icon="CreditCard" title={`金额与${config.paymentColumnLabel}记录`}
                right={
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)]">合同总额</p>
                    <p className="text-numeric-xl font-mono tabular-nums tracking-tight text-[color:var(--fg)]">
                      <span className="text-base font-semibold text-[color:var(--fg-2)] mr-1">¥</span>{formatMoney(contract.amount)}
                    </p>
                  </div>
                } />
              {/* 进度条：已收/已付 vs 合同总额 */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-[color:var(--muted)]">{config.paymentColumnLabel} <span className="font-mono tabular-nums text-[color:var(--fg)]">¥{formatMoney(paidTotal)}</span></span>
                  <span className="font-mono tabular-nums text-[color:var(--fg-2)]">{paidPercent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-[color:var(--panel-2)] overflow-hidden">
                  <div className="h-full rounded-full bg-[color:var(--accent)] transition-transform duration-300" style={{ transformOrigin: 'left', width: '100%', transform: `scaleX(${paidPercent / 100})` }} />
                </div>
              </div>
              {contractPayments.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[color:var(--border)]">
                      <th className="py-2 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">日期</th>
                      <th className="py-2 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">备注</th>
                      <th className="py-2 text-right text-xs font-semibold uppercase tracking-wider text-[color:var(--muted)]">金额 (¥)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contractPayments.map(r => (
                      <tr key={r.id} className="border-b border-[color:var(--border)] last:border-b-0">
                        <td className="py-2.5 font-mono tabular-nums text-[color:var(--fg-2)]">{r.recordDate || '-'}</td>
                        <td className="py-2.5 text-[color:var(--fg-2)] truncate max-w-[240px]">{r.remarks || '-'}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-[color:var(--fg)]">{formatMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-[color:var(--muted)] py-3">暂无{config.paymentColumnLabel}记录</p>
              )}
            </div>
          )}

          {/* 关联项目 */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-5">
            <SectionHeader icon="FolderKanban" title="关联项目" />
            {project ? (
              <div className="inline-flex items-center gap-3 border border-[color:var(--border)] rounded-lg px-4 py-3 bg-[color:var(--panel-2)]">
                <div className="w-9 h-9 rounded-lg bg-[color:var(--card)] border border-[color:var(--border)] flex items-center justify-center">
                  <Icon name="Building2" size={18} className="text-[color:var(--fg-2)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[color:var(--fg)]">{project.name}</p>
                  <p className="text-xs font-mono tabular-nums text-[color:var(--muted)]">PRJ-{String(project.id).padStart(3, '0')}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[color:var(--muted)]">未关联项目</p>
            )}
          </div>
        </div>

        {/* 右栏 */}
        <aside className="w-[300px] shrink-0 flex flex-col gap-6">
          {/* 状态时间线 */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-5">
            <SectionHeader icon="Clock" title="状态时间线" />
            <div className="flex flex-col">
              {timeline.map((node, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${node.active ? 'bg-success-500' : 'bg-[color:var(--border-strong)]'}`} />
                    {i < timeline.length - 1 && <span className="w-px flex-1 bg-[color:var(--border)] my-1" />}
                  </div>
                  <div className={i < timeline.length - 1 ? 'pb-4' : ''}>
                    <p className="text-sm font-semibold text-[color:var(--fg)] leading-tight">{node.label}</p>
                    <p className="text-xs font-mono tabular-nums text-[color:var(--muted)] mt-0.5">{node.date}</p>
                    {node.desc && <p className="text-xs text-[color:var(--muted)] mt-0.5">{node.desc}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 附件 */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-5">
            <SectionHeader icon="Paperclip" title={`附件 (${contract.fileUrl ? 1 : 0})`} />
            {contract.fileUrl ? (
              <button
                onClick={onPreviewFile}
                className="w-full flex items-center gap-3 border border-[color:var(--border)] rounded-lg px-3 py-2.5 hover:border-[color:var(--accent)] hover:bg-[color:var(--panel-2)] transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-[color:var(--panel-2)] border border-[color:var(--border)] flex items-center justify-center shrink-0">
                  <Icon name={contract.fileType === 'pdf' ? 'FileText' : contract.fileType === 'excel' ? 'FileSpreadsheet' : contract.fileType === 'word' ? 'File' : 'Image'} size={16} className="text-[color:var(--fg-2)]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[color:var(--fg)] truncate">{contract.name} 合同附件</p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {contract.fileType === 'pdf' ? 'PDF 文件' : contract.fileType === 'word' ? 'Word 文档' : contract.fileType === 'excel' ? 'Excel 表格' : '图片文件'} · 点击预览
                  </p>
                </div>
              </button>
            ) : (
              <p className="text-sm text-[color:var(--muted)]">暂无附件</p>
            )}
          </div>

          {/* 相关方 */}
          <div className="bg-[color:var(--card)] border border-[color:var(--border)] rounded-lg p-5">
            <SectionHeader icon="Users" title="相关方" />
            {partner ? (
              <div className="border border-[color:var(--border)] rounded-lg p-3.5 bg-[color:var(--panel-2)]">
                <p className="text-xs font-bold uppercase tracking-wider text-[color:var(--muted)] mb-1.5">{config.partnerLabel}</p>
                <p className="text-sm font-semibold text-[color:var(--fg)]">{partner.name}</p>
                {partner.contact && (
                  <p className="text-xs text-[color:var(--fg-2)] mt-1.5 flex items-center gap-1.5">
                    <Icon name="UserCircle" size={13} className="text-[color:var(--muted)]" /> {partner.contact}
                  </p>
                )}
                {partner.phone && (
                  <p className="text-xs font-mono tabular-nums text-[color:var(--fg-2)] mt-1 flex items-center gap-1.5">
                    <Icon name="Phone" size={13} className="text-[color:var(--muted)]" /> {partner.phone}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-[color:var(--muted)]">未关联单位</p>
            )}
          </div>
        </aside>
      </div>
    </Modal>
  )
}

export default ContractDetailModal
