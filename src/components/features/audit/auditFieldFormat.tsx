import React from 'react'
import { formatMoney } from '../../../utils/format'
import { AuditLog } from '../../../utils/audit'

const COMMON_FIELDS: Record<string, string> = {
  name: '名称', status: '状态', remarks: '备注', amount: '金额',
  projectId: '关联项目', partnerId: '关联单位', contractNo: '合同编号',
  signedDate: '签订日期', startDate: '开始日期', endDate: '结束日期',
  paymentMethod: '付款方式', fileUrl: '附件',
}

const RESOURCE_FIELDS: Record<string, Record<string, string>> = {
  projects: { description: '描述', budget: '预算', projectManagerId: '项目经理' },
  members: { phone: '电话', idNumber: '身份证号', position: '职位', entryDate: '入职时间', actualLeaveDate: '离职日期', memberType: '人员类型' },
  incomeContracts: { partnerLabel: '甲方' },
  expenseContracts: { partnerLabel: '乙方' },
  invoices: { invoiceNo: '发票号码', taxAmount: '税额', kind: '发票类型', invoiceDate: '开票日期' },
  payments: { recordDate: '日期', type: '类型', receivedAmount: '已收金额', contractId: '关联合同', invoiceId: '关联发票' },
  tasks: { priority: '优先级', assigneeId: '负责人', dueDate: '截止日期' },
  expenses: { category: '类别', expenseDate: '日期', projectId: '关联项目' },
  costLedger: { direction: '方向', amount: '金额', category: '分类', date: '日期', counterparty: '对方', channel: '支付渠道', summary: '摘要', projectId: '关联项目' },
}

const STATUS_MAP: Record<string, string> = {
  active: '进行中', draft: '草稿', pending: '待审批', expired: '已到期',
  terminated: '已终止', archived: '已归档', completed: '已完成',
  paid: '已付清', unpaid: '未付', partially_paid: '部分付款',
  received: '已收齐', issued: '已开具', cancelled: '已作废',
}

export function getFieldLabel(resource: string, field: string): string {
  return RESOURCE_FIELDS[resource]?.[field] || COMMON_FIELDS[field] || field
}

export function formatFieldValue(resource: string, field: string, value: any): string {
  if (value === undefined || value === null) return '（空）'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') {
    if (Array.isArray(value)) return `[${value.length} 项]`
    return JSON.stringify(value)
  }
  if (field === 'amount' || field === 'budget' || field === 'taxAmount' || field === 'receivedAmount') {
    const num = Number(value)
    if (!isNaN(num)) return `¥${formatMoney(num)}`
  }
  if (field === 'status' && STATUS_MAP[String(value)]) {
    return STATUS_MAP[String(value)]
  }
  return String(value)
}

export function renderAuditDetail(log: AuditLog): React.ReactNode {
  const details = log.details
  if (!details) return <p className="text-slate-500 text-sm">无详细信息</p>

  if (details.count !== undefined && !details.before && !details.after) {
    return (
      <div className="space-y-2">
        {details.count !== undefined && (
          <div className="text-sm text-slate-600">数量：<span className="font-medium">{details.count}</span> 条</div>
        )}
        {details.reason && <div className="text-sm text-slate-600">原因：{details.reason}</div>}
      </div>
    )
  }

  if (details.approved !== undefined) {
    return (
      <div className="space-y-2">
        <div className="text-sm text-slate-600">
          审批结果：<span className={`font-medium ${details.approved ? 'text-green-600' : 'text-red-600'}`}>{details.approved ? '通过' : '驳回'}</span>
        </div>
        {details.reason && <div className="text-sm text-slate-600">原因：{details.reason}</div>}
      </div>
    )
  }

  if (details.before !== undefined || details.after !== undefined) {
    const changes: Array<{ field: string; before: string; after: string }> = []
    const beforeObj = (typeof details.before === 'object' && details.before !== null) ? details.before : {}
    const afterObj = (typeof details.after === 'object' && details.after !== null) ? details.after : {}
    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])
    for (const key of allKeys) {
      const beforeVal = (beforeObj as Record<string, unknown>)[key]
      const afterVal = (afterObj as Record<string, unknown>)[key]
      if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
        changes.push({
          field: key,
          before: formatFieldValue(log.resource, key, beforeVal),
          after: formatFieldValue(log.resource, key, afterVal),
        })
      }
    }
    if (changes.length === 0) {
      return <p className="text-slate-500 text-sm">无字段变更</p>
    }
    return (
      <div className="space-y-2">
        {changes.map(c => (
          <div key={c.field} className="text-sm">
            <span className="font-medium text-slate-700">{getFieldLabel(log.resource, c.field)}：</span>
            <span className="text-red-600 line-through mr-2">{c.before}</span>
            <span className="text-slate-400">→</span>
            <span className="text-green-600 ml-2">{c.after}</span>
          </div>
        ))}
      </div>
    )
  }

  return <p className="text-slate-500 text-sm">无详细信息</p>
}
