/**
 * SnapshotsTab — 数据回滚管理
 * 展示数据库快照列表，支持手动创建、还原、删除、设置上限
 */

import React, { useState, useEffect } from 'react'
import { DataTable, type Column } from '@/components/DataTable'
import { Icon } from './ui/Icon'
import { Tooltip } from './ui/Tooltip/Tooltip'
import { useToastStore } from '@/store/toastStore'
import { useConfirm } from '../hooks/useConfirm'
import type { SnapshotInfo } from '../types/electron'
import { getAPI } from '@/services/api-adapter'
import { SNAPSHOT_TABLE_LABELS } from '../constants/snapshots'

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
      const api = await getAPI()
      const [listRes, maxRes] = await Promise.allSettled([
        api.getSnapshots(),
        api.getMaxSnapshots(),
      ])
      if (listRes.status === 'fulfilled' && listRes.value?.success) setSnapshots(listRes.value.data || [])
      if (maxRes.status === 'fulfilled' && maxRes.value?.success) setMaxCount(maxRes.value.data?.maxCount ?? 200)
    } catch (error) {
      console.error('加载快照失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSnapshots() }, [])

  const handleCreate = async () => {
    const result = await (await getAPI()).createSnapshot('手动备份')
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
      const result = await (await getAPI()).restoreSnapshot(snap.timestamp)
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
    const result = await (await getAPI()).deleteSnapshot(snap.timestamp)
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
    const result = await (await getAPI()).setMaxSnapshots(n)
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

  const columns: Column<SnapshotInfo & { _index: number }>[] = [
    { key: 'timestamp', title: '时间', render: (item) => (
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-800 font-medium">
            {item.timestamp.replace('T', ' ')}
          </span>
          {item._index === 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
              ← 当前状态
            </span>
          )}
        </div>
        {item.label && (
          <span className="text-xs text-slate-400 mt-0.5 block">标签：{item.label}</span>
        )}
      </div>
    )},
    { key: 'fileSize', title: '大小', render: (item) => <span className="text-sm text-slate-600">{formatSize(item.fileSize)}</span> },
    { key: 'dbSummary', title: '数据概况', render: (item) => (
      <div className="flex flex-wrap gap-1 max-w-xs">
        {Object.entries(item.dbSummary).filter(([, v]) => (v as number) > 0).slice(0, 5).map(([key, val]) => (
          <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600">
            {SNAPSHOT_TABLE_LABELS[key] || key}: {val as number}
          </span>
        ))}
        {Object.entries(item.dbSummary).filter(([, v]) => (v as number) > 0).length > 5 && (
          <span className="text-xs text-slate-400">
            +{Object.entries(item.dbSummary).filter(([, v]) => (v as number) > 0).length - 5}
          </span>
        )}
      </div>
    )},
    { key: 'actions', title: '操作', align: 'center', width: 'w-40', render: (item) => (
      <div className="flex items-center justify-center gap-1">
        {item._index > 0 && (
          <button
            onClick={() => handleRestore(item)}
            disabled={restoring}
            className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 disabled:opacity-50 transition-colors"
          >
            {restoring ? '还原中...' : '还原'}
          </button>
        )}
        <Tooltip content="删除快照" position="top" delay={300}>
          <button
            onClick={() => handleDelete(item)}
            className="px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            <Icon name="Trash2" size={14} />
          </button>
        </Tooltip>
      </div>
    )},
  ]

  // Add _index for row highlighting
  const dataWithIndex = snapshots.map((snap, i) => ({ ...snap, _index: i }))

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
      ) : (
        <DataTable
          data={dataWithIndex}
          columns={columns}
          rowKey="timestamp"
          pagination={false}
          showContainer={true}
          stickyHeader={true}
          loading={false}
          emptyText="暂无快照"
          emptyIcon="Clock"
        />
      )}

      {ConfirmDialog}
    </div>
  )
}
