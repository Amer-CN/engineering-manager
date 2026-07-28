import { motion, AnimatePresence } from 'framer-motion'
import { workerTypes } from './memberFormTypes'
import type { WorkerTeam } from '@/types'
import type { PickEntry } from './useWorkerPicker'

interface Props {
  showAdvanced: boolean
  selected: Map<number, PickEntry>
  hasDefaultTeam: boolean
  bulkWorkerType: string
  bulkDailyWage: number
  workerTeams: WorkerTeam[]
  updateEntry: (workerId: number, field: keyof PickEntry, value: any) => void
  setBulkWorkerType: (v: string) => void
  setBulkDailyWage: (v: number) => void
}

export function WorkerPickerAdvancedPanel({
  showAdvanced, selected, hasDefaultTeam,
  bulkWorkerType, bulkDailyWage, workerTeams,
  updateEntry, setBulkWorkerType, setBulkDailyWage,
}: Props) {
  return (
    <AnimatePresence>
      {showAdvanced && selected.size > 0 && !hasDefaultTeam && (
        <motion.div
          className="w-80 border-l border-[color:var(--border)] bg-[color:var(--panel-2)] flex flex-col shrink-0"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
        >
          <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between">
            <span className="text-sm font-semibold text-[color:var(--fg-2)]">已选 {selected.size} 人</span>
          </div>
          <div className="px-4 py-3 border-b border-[color:var(--border)] bg-[color:var(--panel-2)] space-y-2">
            <div className="flex items-center gap-2">
              <select value={bulkWorkerType} onChange={e => setBulkWorkerType(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-[color:var(--border)] rounded bg-[color:var(--card)] text-[color:var(--fg-2)]">
                {workerTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="number" value={bulkDailyWage} onChange={e => setBulkDailyWage(Number(e.target.value))}
                className="w-20 px-2 py-1 text-xs border border-[color:var(--border)] rounded bg-[color:var(--card)] text-[color:var(--fg-2)]" min={0} />
            </div>
            <button onClick={() => {
              for (const id of selected.keys()) {
                updateEntry(id, 'workerType', bulkWorkerType)
                updateEntry(id, 'dailyWage', bulkDailyWage)
              }
            }} className="w-full px-3 py-1.5 text-xs bg-[color:var(--accent)] hover:opacity-90 text-[color:var(--on-accent)] rounded font-medium transition-colors">
              应用到全部已选 ({selected.size}人)
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {[...selected.entries()].map(([id, entry]) => (
              <div key={id} className="bg-[color:var(--card)] rounded-lg p-3 border border-[color:var(--border)]">
                <div className="text-sm font-medium text-[color:var(--fg)] mb-2">{entry.worker.name}</div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-[color:var(--muted)] block mb-0.5">班组</label>
                    <select
                      value={entry.teamId || ''}
                      onChange={e => updateEntry(id, 'teamId', e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-2 py-1 text-xs border border-[color:var(--border)] rounded bg-[color:var(--card)] text-[color:var(--fg-2)]"
                    >
                      <option value="">未分配</option>
                      {workerTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-[color:var(--muted)] block mb-0.5">工种</label>
                      <select
                        value={entry.workerType}
                        onChange={e => updateEntry(id, 'workerType', e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-[color:var(--border)] rounded bg-[color:var(--card)] text-[color:var(--fg-2)]"
                      >
                        {workerTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-xs text-[color:var(--muted)] block mb-0.5">日工资</label>
                      <input
                        type="number"
                        value={entry.dailyWage}
                        onChange={e => updateEntry(id, 'dailyWage', Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs border border-[color:var(--border)] rounded bg-[color:var(--card)] text-[color:var(--fg-2)]"
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
  )
}
