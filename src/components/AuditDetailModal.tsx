import React from 'react'
import { AuditLog, AuditAction } from '../utils/audit'
import { formatMoney } from '../utils/format'

interface AuditDetailModalProps {
  selectedLog: AuditLog
  onClose: () => void
  actionConfig: Record<AuditAction, { label: string; color: string; bgColor: string }>
  resourceLabels: Record<string, string>
}

// 字段名→中文标签映射（按资源类型）
const getFieldLabel = (resource: string, field: string): string => {
  const commonFields: Record<string, string> = {
    name: '名称', status: '状态', remarks: '备注', amount: '金额',
    projectId: '关联项目', partnerId: '关联单位', contractNo: '合同编号',
    signedDate: '签订日期', startDate: '开始日期', endDate: '结束日期',
    paymentMethod: '付款方式', fileUrl: '附件',
  }
  const resourceFields: Record<string, Record<string, string>> = {
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
  return resourceFields[resource]?.[field] || commonFields[field] || field
}

// 格式化单个值为可读文本
const formatFieldValue = (resource: string, field: string, value: any): string => {
  if (value === undefined || value === null) return '（空）'
  if (typeof value === 'boolean') return value ? '是' : '否'
  if (typeof value === 'object') {
    if (Array.isArray(value)) return `[${value.length} 项]`
    return JSON.stringify(value)
  }
  // 金额字段格式化
  if (field === 'amount' || field === 'budget' || field === 'taxAmount' || field === 'receivedAmount') {
    const num = Number(value)
    if (!isNaN(num)) return `¥${formatMoney(num)}`
  }
  // 状态值翻译
  if (field === 'status') {
    const statusMap: Record<string, string> = {
      active: '进行中', draft: '草稿', pending: '待审批', expired: '已到期',
      terminated: '已终止', archived: '已归档', completed: '已完成',
      paid: '已付清', unpaid: '未付', partially_paid: '部分付款',
      received: '已收齐', issued: '已开具', cancelled: '已作废',
    }
    if (statusMap[String(value)]) return statusMap[String(value)]
  }
  return String(value)
}

// 渲染详情信息（人可读格式）
const renderDetail = (log: AuditLog) => {
  const details = log.details
  if (!details) return <p className="text-slate-500 text-sm">无详细信息</p>

  // 导出/删除等没有 before/after 的操作
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

  // 审批操作
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

  // 更新操作：before/after 对比
  if (details.before && details.after) {
    const allFields = Array.from(new Set([...Object.keys(details.before), ...Object.keys(details.after)]))
    const changedFields = allFields.filter(f => {
      const b = details.before[f]
      const a = details.after[f]
      return JSON.stringify(b) !== JSON.stringify(a)
    })

    if (changedFields.length === 0) {
      return <p className="text-sm text-slate-500">无字段变更</p>
    }

    return (
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 w-24">字段</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">修改前</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">修改后</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {changedFields.map(field => (
              <tr key={field}>
                <td className="px-3 py-2 text-xs font-medium text-slate-600">{getFieldLabel(log.resource, field)}</td>
                <td className="px-3 py-2 text-xs text-slate-500 line-through">{formatFieldValue(log.resource, field, details.before[field])}</td>
                <td className="px-3 py-2 text-xs text-slate-800 font-medium">{formatFieldValue(log.resource, field, details.after[field])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // 创建操作：仅 after
  if (details.after && !details.before) {
    const fields = Object.keys(details.after).filter(k => k !== 'fileUrl' || (typeof details.after[k] === 'string' && details.after[k].length < 100))
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-slate-600">创建内容</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {fields.slice(0, 12).map(field => (
            <div key={field} className="flex justify-between text-sm">
              <span className="text-slate-500">{getFieldLabel(log.resource, field)}</span>
              <span className="text-slate-800 font-medium">{formatFieldValue(log.resource, field, details.after[field])}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 删除操作：仅 before
  if (details.before && !details.after) {
    const fields = Object.keys(details.before).filter(k => k !== 'fileUrl' || (typeof details.before[k] === 'string' && details.before[k].length < 100))
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-red-600">已删除内容</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {fields.slice(0, 12).map(field => (
            <div key={field} className="flex justify-between text-sm">
              <span className="text-slate-500">{getFieldLabel(log.resource, field)}</span>
              <span className="text-slate-800 font-medium">{formatFieldValue(log.resource, field, details.before[field])}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return <p className="text-sm text-slate-500">无详细信息</p>
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ selectedLog, onClose, actionConfig, resourceLabels }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">操作日志详情</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500">时间</label>
              <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">
                {new Date(selectedLog.timestamp).toLocaleString('zh-CN')}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">用户</label>
              <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">{selectedLog.username}</div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">操作类型</label>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  actionConfig[selectedLog.action]?.bgColor || 'bg-slate-100'
                } ${actionConfig[selectedLog.action]?.color || 'text-slate-700'}`}>
                  {actionConfig[selectedLog.action]?.label || selectedLog.action}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500">资源类型</label>
              <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">
                {resourceLabels[selectedLog.resource] || selectedLog.resource}
              </div>
            </div>
            {selectedLog.resourceName && (
              <div className="col-span-2">
                <label className="text-xs font-medium text-slate-500">资源名称</label>
                <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">{selectedLog.resourceName}</div>
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs font-medium text-slate-500">描述</label>
              <div className="text-sm text-slate-800 dark:text-slate-100 mt-1">{selectedLog.description}</div>
            </div>
          </div>

          {/* 详细信息 */}
          <div className="pt-4 border-t border-slate-100">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 block">详细信息</label>
            {renderDetail(selectedLog)}
          </div>
        </div>
      </div>
    </div>
  )
}
