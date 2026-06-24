import { motion } from 'framer-motion'
import { Icon } from '../../ui/Icon'
import type { ProjectWorker, WorkerTeam } from '@/types'
import { workerTypes } from './memberFormTypes'
import { WorkerPickerItem } from './WorkerPickerItem'
import { WorkerPickerAdvancedPanel } from './WorkerPickerAdvancedPanel'
import { useWorkerPicker } from './useWorkerPicker'
import { Button } from '../../ui/Button'

interface Props {
  show: boolean
  projectId: number
  workerTeams: WorkerTeam[]
  existingWorkerIds: Set<number>
  defaultTeamId?: number
  onClose: () => void
  onConfirm: (entries: Partial<ProjectWorker>[]) => void
}

export function WorkerPickerModal({ show, projectId, workerTeams, existingWorkerIds, defaultTeamId, onClose, onConfirm }: Props) {
  const picker = useWorkerPicker({
    show, projectId, workerTeams, existingWorkerIds, defaultTeamId, onConfirm, onClose,
  })
  const {
    workers, search, hideExisting, selected, showAdvanced, loading,
    bulkWorkerType, bulkDailyWage, searchRef,
    filtered, allSelectable, allSelected, teamName, hasDefaultTeam,
    setHideExisting, setShowAdvanced, setBulkWorkerType, setBulkDailyWage,
    toggleWorker, toggleAll, updateEntry, handleConfirm, handleSearchChange,
  } = picker

  if (!show) return null

  return (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70]" onClick={onClose}>
  <motion.div
  className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-5xl max-h-[90vh] flex flex-col"
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
  onClick={e => e.stopPropagation()}
  >
  {/* Header */}
  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
  <div>
  <h3 className="text-lg font-semibold text-slate-800">
  从工人库添加{teamName ? `到「${teamName}」` : ''}
  </h3>
  <p className="text-sm text-slate-500 mt-0.5">
  {hasDefaultTeam ? '勾选工人后直接添加到当前班组' : '搜索并选择工人加入当前项目'}
  </p>
  </div>
  <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
  <Icon name="X" size={20} />
  </button>
  </div>

  {/* Toolbar */}
  <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
  <div className="relative flex-1">
  <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
  <input
  ref={searchRef}
  type="text"
  placeholder="搜索姓名、身份证号、手机号..."
  value={search}
  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  onChange={handleSearchChange}
  autoFocus
  />
  </div>
  <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer select-none">
  <input type="checkbox" checked={hideExisting} onChange={e => setHideExisting(e.target.checked)} className="rounded" />
  隐藏已在项目的
  </label>
  {!hasDefaultTeam && (
  <button
  onClick={() => setShowAdvanced(v => !v)}
  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${
  showAdvanced
  ? 'bg-blue-100 text-blue-700'
  : 'text-slate-500 hover:bg-slate-100'
  }`}
  >
  <Icon name="Settings" size={14} />
  高级设置
  </button>
  )}
  </div>

  {/* Bulk defaults bar — when adding to a specific team, always visible */}
  {hasDefaultTeam && (
  <div className="px-6 py-2.5 border-b border-slate-100 bg-blue-50/50 flex items-center gap-4 shrink-0">
  <span className="text-xs text-slate-500 font-medium">默认值：</span>
  <div className="flex items-center gap-2">
  <label className="text-xs text-slate-500">工种</label>
  <select
  value={bulkWorkerType}
  onChange={e => setBulkWorkerType(e.target.value)}
  className="px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
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
  className="w-20 px-2 py-1 text-xs border border-slate-200 rounded bg-white text-slate-700"
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
  <div className="divide-y divide-slate-100">
  {/* Select all row */}
  <div className="flex items-center px-6 py-2 bg-slate-50 border-b border-slate-200">
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

  <WorkerPickerAdvancedPanel
    showAdvanced={showAdvanced}
    selected={selected}
    hasDefaultTeam={hasDefaultTeam}
    bulkWorkerType={bulkWorkerType}
    bulkDailyWage={bulkDailyWage}
    workerTeams={workerTeams}
    updateEntry={updateEntry}
    setBulkWorkerType={setBulkWorkerType}
    setBulkDailyWage={setBulkDailyWage}
  />
  </div>

  {/* Footer */}
  <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0">
  <span className="text-sm text-slate-500">
  {filtered.length} 人可选用
  {selected.size > 0 && <span className="text-blue-600 ml-1">· 已选 {selected.size} 人</span>}
  </span>
  <div className="flex items-center gap-3">
  <Button onClick={onClose}  variant="secondary" className="text-sm">
  取消
  </Button>
  <Button
  onClick={handleConfirm}
  disabled={selected.size === 0}
  
   variant="primary" className="text-sm disabled:bg-slate-300 disabled:cursor-not-allowed">
  确认添加{selected.size > 0 ? ` ${selected.size} 人到「${teamName ?? '项目'}」` : ''}
  </Button>
  </div>
  </div>
  </motion.div>
  </div>
  )
}
