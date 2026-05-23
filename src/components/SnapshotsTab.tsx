/**
 * SnapshotsTab — 数据回滚管理
 * 展示数据库快照列表，支持手动创建、还原、删除、设置上限
 */

import React, { useState, useEffect } from 'react'
import { Icon } from './ui/Icon'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '../hooks/useConfirm'
import type { SnapshotInfo } from '../types/electron'

const TABLE_LABELS: Record<string, string> = {
  projects: '项目',
  members: '人员',
  drawings: '图纸',
  materials: '材料',
  expenses: '费用',
  costLedger: '台账',
  partners: '合作单位',
  incomeContracts: '收入合同',
  expenseContracts: '支出合同',
  workerTeams: '班组',
  settlements: '结算',
  inventoryItems: '库存',
  invoices: '发票',
  auditLogs: '审计日志',
}

export const SnapshotsTab: React.FC = () => {
  const showToast = useToastStore(state => state.showToast)
  const { confirm, ConfirmDialog } = useConfirm()
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const [maxCount, setMaxCount] = useState(200)
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)

  const loadSnapshots = async () => {
    setLoading(true)
    try {
      const [listRes, maxRes] = await Promise.all([
        window.electronAPI.getSnapshots(),
        window.electronAPI.getMaxSnapshots(),
      ])
      if (listRes.success && listRes.data) setSnapshots(listRes.data)
      if (maxRes.success && maxRes.data) setMaxCount(maxRes.data.maxCount)
    } catch (error) {
      console.error('加载快照失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSnapshots() }, [])

  const handleCreate = async () => {
    const result = await window.electronAPI.createSnapshot('手动备份')
    if (result.success) {
      showToast('备份创建成功', 'success')
      loadSnapshots()
    } else {
      showToast(result.error || '创建失败', 'error')
    }
  }

  const handleRestore = async (snap: SnapshotInfo) => {
    const ok = await confirm({
      title: '确认还原',
      content: `将还原到 ${snap.timestamp.replace('T', ' ')} 的数据状态。该时间点之后的所有修改将丢失。还原前会自动备份当前状态。`,
      confirmVariant: 'danger',
      confirmText: '确认还原',
    })
    if (!ok) return

    setRestoring(true)
    try {
      const result = await window.electronAPI.restoreSnapshot(snap.timestamp)
      if (result.success) {
        showToast('数据已还原，请刷新页面查看', 'success')
        loadSnapshots()
      } else {
        showToast(result.error || '还原失败', 'error')
      }
    } catch (error: any) {
      showToast(error?.message || '还原失败', 'error')
    } finally {
      setRestoring(false)
    }
  }

  const handleDelete = async (snap: SnapshotInfo) => {
    const ok = await confirm({
      title: '删除快照',
      content: `确定删除 ${snap.timestamp.replace('T', ' ')} 的快照吗？此操作不可撤销。`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    const result = await window.electronAPI.deleteSnapshot(snap.timestamp)
    if (result.success) {
      showToast('快照已删除', 'success')
      loadSnapshots()
    } else {
      showToast(result.error || '删除失败', 'error')
    }
  }

  const handleSetMaxCount = async () => {
    const input = prompt('设置最大快照数量（50～1000）：', String(maxCount))
    if (!input) return
    const n = parseInt(input, 10)
    if (isNaN(n) || n < 50 || n > 1000) {
      showToast('请输入 50～1000 之间的数字', 'error')
      return
    }
    const result = await window.electronAPI.setMaxSnapshots(n)
    if (result.success) {
      setMaxCount(result.data?.maxCount || n)
      showToast(`快照上限已设为 ${result.data?.maxCount || n}`, 'success')
    } else {
      showToast(result.error || '设置失败', 'error')
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-slate-800">数据快照</h3>
          <span className="text-sm text-slate-400">共 {snapshots.length} 个</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSetMaxCount}
            className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            上限：{maxCount} 个
          </button>
          <button onClick={handleCreate}
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors">
            <span className="flex items-center gap-1.5">
              <Icon name="Plus" size={14} /> 手动创建备份
            </span>
          </button>
        </div>
      </div>

      {/* 说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        每次保存数据时自动创建快照。还原到某个时间点后，该时间点之后的所有变更将丢失。
        建议在重大操作前手动创建备份。
      </div>

      {/* 快照列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Icon name="Clock" size={36} className="mx-auto mb-2" />
          <p className="text-sm">暂无快照</p>
          <p className="text-xs mt-1">修改数据后会自动创建</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">时间</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">大小</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">数据概况</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase w-40">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshots.map((snap, i) => (
                <tr key={snap.timestamp} className={i === 0 ? 'bg-primary-50/50' : ''}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-800 font-medium">
                        {snap.timestamp.replace('T', ' ')}
                      </span>
                      {i === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                          ← 当前状态
                        </span>
                      )}
                    </div>
                    {snap.label && (
                      <span className="text-xs text-slate-400 mt-0.5 block">标签：{snap.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatSize(snap.fileSize)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {Object.entries(snap.dbSummary).filter(([, v]) => (v as number) > 0).slice(0, 5).map(([key, val]) => (
                        <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
                          {TABLE_LABELS[key] || key}: {val as number}
                        </span>
                      ))}
                      {Object.entries(snap.dbSummary).filter(([, v]) => (v as number) > 0).length > 5 && (
                        <span className="text-xs text-slate-400">
                          +{Object.entries(snap.dbSummary).filter(([, v]) => (v as number) > 0).length - 5}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {i > 0 && (
                        <button
                          onClick={() => handleRestore(snap)}
                          disabled={restoring}
                          className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
                        >
                          {restoring ? '还原中...' : '还原'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(snap)}
                        className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
                        title="删除快照"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
