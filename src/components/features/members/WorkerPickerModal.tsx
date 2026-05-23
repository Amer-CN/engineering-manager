import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { Worker, ProjectWorker, WorkerTeam } from '@/types'
import { workerTypes, workerTypeToCode } from './memberFormTypes'
import { WorkerPickerItem } from './WorkerPickerItem'

interface Props {
  show: boolean
  projectId: number
  workerTeams: WorkerTeam[]
  existingWorkerIds: Set<number>
  defaultTeamId?: number
  onClose: () => void
  onConfirm: (entries: Partial<ProjectWorker>[]) => void
}

interface PickEntry {
  worker: Worker
  teamId: number | null
  dailyWage: number
  workerType: string
}

export function WorkerPickerModal({ show, projectId, workerTeams, existingWorkerIds, defaultTeamId, onClose, onConfirm }: Props) {
  const [workers, setWorkers] = useState<(Worker & { projectCount: number })[]>([])
  const [search, setSearch] = useState('')
  const [hideExisting, setHideExisting] = useState(true)
  const [selected, setSelected] = useState<Map<number, PickEntry>>(new Map())
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bulkWorkerType, setBulkWorkerType] = useState('other')
  const [bulkDailyWage, setBulkDailyWage] = useState(350)
  const searchRef = useRef<HTMLInputElement>(null)

  // Whether we're adding to a specific team (simplified flow)
  const hasDefaultTeam = defaultTeamId != null

  useEffect(() => {
    if (!show) return
    setLoading(true)
    window.electronAPI.getWorkers()
      .then(res => { if (res.success && res.data) setWorkers(res.data as any) })
      .catch(() => {})
      .finally(() => setLoading(false))
    setSearch(''); setSelected(new Map()); setShowAdvanced(false)
  }, [show])

  const filtered = useMemo(() => {
    let list = workers
    if (search.trim()) {
      const kw = search.trim().toLowerCase()
      list = list.filter(w =>
        w.name.toLowerCase().includes(kw) ||
        w.idCard.toLowerCase().includes(kw) ||
        (w.phone && w.phone.includes(search.trim()))
      )
    }
    if (hideExisting) {
      list = list.filter(w => !existingWorkerIds.has(w.id))
    }
    return list
  }, [workers, search, hideExisting, existingWorkerIds])

  const toggleWorker = useCallback((worker: Worker) => {
    setSelected(prev => {
      const next = new Map(prev)
      if (next.has(worker.id)) {
        next.delete(worker.id)
      } else {
        next.set(worker.id, {
          worker,
          teamId: defaultTeamId ?? null,
          dailyWage: worker.dailyWage ?? bulkDailyWage,
          workerType: (workerTypeToCode(worker.workerType!) ?? bulkWorkerType) as string
        })
      }
      return next
    })
  }, [defaultTeamId, bulkDailyWage, bulkWorkerType])

  const toggleAll = useCallback(() => {
    if (selected.size === filtered.length) {
      setSelected(new Map())
    } else {
      const next = new Map<number, PickEntry>()
      for (const w of filtered) {
        if (!existingWorkerIds.has(w.id)) {
          next.set(w.id, {
            worker: w,
            teamId: defaultTeamId ?? null,
            dailyWage: w.dailyWage ?? bulkDailyWage,
            workerType: (workerTypeToCode(w.workerType!) ?? bulkWorkerType) as string
          })
        }
      }
      setSelected(next)
    }
  }, [filtered, selected.size, existingWorkerIds, defaultTeamId, bulkDailyWage, bulkWorkerType])

  const updateEntry = useCallback((workerId: number, field: keyof PickEntry, value: any) => {
    setSelected(prev => {
      const next = new Map(prev)
      const entry = next.get(workerId)
      if (entry) next.set(workerId, { ...entry, [field]: value })
      return next
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const entries: Partial<ProjectWorker>[] = []
    for (const [, entry] of selected) {
      entries.push({
        workerId: entry.worker.id,
        projectId,
        teamId: entry.teamId || undefined,
        dailyWage: entry.dailyWage,
        workerType: entry.workerType,
        entryDate: new Date().toISOString().split('T')[0],
        status: 'active' as const
      })
    }
    onConfirm(entries)
    onClose()
  }, [selected, projectId, onConfirm, onClose])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  if (!show) return null

  const teamName = hasDefaultTeam ? workerTeams.find(t => t.id === defaultTeamId)?.name : null
  const allSelectable = filtered.filter(w => !existingWorkerIds.has(w.id))
  const allSelected = allSelectable.length > 0 && selected.size === allSelectable.length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={onClose}>
      <motion.div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              从工人库添加{teamName ? `到「${teamName}」` : ''}
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {hasDefaultTeam ? '勾选工人后直接添加到当前班组' : '搜索并选择工人加入当前项目'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <Icon name="X" size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 shrink-0">
          <div className="relative flex-1">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              placeholder="搜索姓名、身份证号、手机号..."
              value={search}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={handleSearchChange}
              autoFocus
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
            <input type="checkbox" checked={hideExisting} onChange={e => setHideExisting(e.target.checked)} className="rounded" />
            隐藏已在项目的
          </label>
          {!hasDefaultTeam && (
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                showAdvanced
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <Icon name="Settings" size={14} />
              高级设置
            </button>
          )}
        </div>

        {/* Bulk defaults bar — when adding to a specific team, always visible */}
        {hasDefaultTeam && (
          <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-900/10 flex items-center gap-4 shrink-0">
            <span className="text-xs text-slate-500 font-medium">默认值：</span>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">工种</label>
              <select
                value={bulkWorkerType}
                onChange={e => setBulkWorkerType(e.target.value)}
                className="px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300"
              >
                {workerTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">日工资</label>
              <input
                type="number"
                value={bulkDailyWage}
                onChange={e => setBulkDailyWage(Number(e.target.value))}
                className="w-20 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                min={0}
              />
            </div>
            <span className="text-xs text-slate-400 ml-auto">新勾选的工人自动使用此默认值</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Worker List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-slate-200 border-t-blue-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Icon name="Users" size={40} className="mb-3 opacity-30" />
                <p className="text-sm">{workers.length === 0 ? '工人库为空，请先导入工人' : '未找到匹配的工人'}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* Select all row */}
                <div className="flex items-center px-6 py-2 bg-slate-50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-600">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded mr-3"
                  />
                  <span className="text-xs text-slate-500">
                    {allSelected ? '取消全选' : `全选 (${allSelectable.length} 人)`}
                    {selected.size > 0 && <span className="text-blue-600 ml-2">已选 {selected.size} 人</span>}
                  </span>
                </div>
                {filtered.map(w => (
                  <WorkerPickerItem
                    key={w.id}
                    w={w}
                    isExisting={existingWorkerIds.has(w.id)}
                    isSelected={selected.has(w.id)}
                    onToggle={toggleWorker}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right: Advanced Edit Panel — only for non-team context, or toggled */}
          <AnimatePresence>
            {showAdvanced && selected.size > 0 && !hasDefaultTeam && (
              <motion.div
                className="w-80 border-l border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex flex-col shrink-0"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">已选 {selected.size} 人</span>
                </div>
                {/* Bulk-set area */}
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-600 bg-blue-50/50 dark:bg-blue-900/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <select value={bulkWorkerType} onChange={e => setBulkWorkerType(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300">
                      {workerTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input type="number" value={bulkDailyWage} onChange={e => setBulkDailyWage(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300" min={0} />
                  </div>
                  <button onClick={() => {
                    for (const id of selected.keys()) {
                      updateEntry(id, 'workerType', bulkWorkerType)
                      updateEntry(id, 'dailyWage', bulkDailyWage)
                    }
                  }} className="w-full px-3 py-1.5 text-xs bg-primary-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
                    应用到全部已选 ({selected.size}人)
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {[...selected.entries()].map(([id, entry]) => (
                    <div key={id} className="bg-white dark:bg-slate-700 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">{entry.worker.name}</div>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-slate-500 block mb-0.5">班组</label>
                          <select
                            value={entry.teamId || ''}
                            onChange={e => updateEntry(id, 'teamId', e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                          >
                            <option value="">未分配</option>
                            {workerTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="text-xs text-slate-500 block mb-0.5">工种</label>
                            <select
                              value={entry.workerType}
                              onChange={e => updateEntry(id, 'workerType', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                            >
                              {workerTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          <div className="w-24">
                            <label className="text-xs text-slate-500 block mb-0.5">日工资</label>
                            <input
                              type="number"
                              value={entry.dailyWage}
                              onChange={e => updateEntry(id, 'dailyWage', Number(e.target.value))}
                              className="w-full px-2 py-1 text-xs border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300"
                              min={0}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <span className="text-sm text-slate-500">
            {filtered.length} 人可选用
            {selected.size > 0 && <span className="text-blue-600 ml-1">· 已选 {selected.size} 人</span>}
          </span>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-5 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm">
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="px-5 py-2 bg-primary-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium"
            >
              确认添加{selected.size > 0 ? ` ${selected.size} 人到「${teamName ?? '项目'}」` : ''}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
