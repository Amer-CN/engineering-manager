import React from 'react'
import { AuditLog, AuditAction } from '../utils/audit'
import { Modal } from './ui/Modal/Modal'
import { renderAuditDetail } from './features/audit/auditFieldFormat'

interface AuditDetailModalProps {
  selectedLog: AuditLog
  onClose: () => void
  actionConfig: Record<AuditAction, { label: string; color: string; bgColor: string }>
  resourceLabels: Record<string, string>
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({ selectedLog, onClose, actionConfig, resourceLabels }) => {
  return (
  <Modal isOpen={true} onClose={onClose} title="操作日志详情" size="xl">
  <div className="space-y-4">
  <div className="grid grid-cols-2 gap-4">
  <div>
  <label className="text-xs font-medium text-[color:var(--muted)]">时间</label>
  <div className="text-sm text-[color:var(--fg)] mt-1">
  {new Date(selectedLog.timestamp).toLocaleString('zh-CN')}
  </div>
  </div>
  <div>
  <label className="text-xs font-medium text-[color:var(--muted)]">用户</label>
  <div className="text-sm text-[color:var(--fg)] mt-1">{selectedLog.username}</div>
  </div>
  <div>
  <label className="text-xs font-medium text-[color:var(--muted)]">操作类型</label>
  <div className="mt-1">
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
  actionConfig[selectedLog.action]?.bgColor || 'bg-[color:var(--panel-2)]'
  } ${actionConfig[selectedLog.action]?.color || 'text-[color:var(--fg-2)]'}`}>
  {actionConfig[selectedLog.action]?.label || selectedLog.action}
  </span>
  </div>
  </div>
  <div>
  <label className="text-xs font-medium text-[color:var(--muted)]">资源类型</label>
  <div className="text-sm text-[color:var(--fg)] mt-1">
  {resourceLabels[selectedLog.resource] || selectedLog.resource}
  </div>
  </div>
  {selectedLog.resourceName && (
  <div className="col-span-2">
  <label className="text-xs font-medium text-[color:var(--muted)]">资源名称</label>
  <div className="text-sm text-[color:var(--fg)] mt-1">{selectedLog.resourceName}</div>
  </div>
  )}
  <div className="col-span-2">
  <label className="text-xs font-medium text-[color:var(--muted)]">描述</label>
  <div className="text-sm text-[color:var(--fg)] mt-1">{selectedLog.description}</div>
  </div>
  </div>
  <div className="pt-4 border-t border-[color:var(--border)]">
  <label className="text-xs font-medium text-[color:var(--muted)] mb-2 block">详细信息</label>
  {renderAuditDetail(selectedLog)}
  </div>
  </div>
  </Modal>
  )
}
