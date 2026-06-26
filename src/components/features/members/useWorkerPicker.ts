import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { Worker, ProjectWorker, WorkerTeam } from '@/types'
import { workerTypeToCode } from './memberFormTypes'
import { getAPI } from '@/services/api-adapter'

export interface PickEntry {
  worker: Worker
  teamId: number | null
  dailyWage: number
  workerType: string
}

export interface UseWorkerPickerParams {
  show: boolean
  projectId: number
  workerTeams: WorkerTeam[]
  existingWorkerIds: Set<number>
  defaultTeamId?: number
  onConfirm: (entries: Partial<ProjectWorker>[]) => void | Promise<void>
  onClose: () => void
}

export interface WorkerPickerApi {
  // 状态
  workers: (Worker & { projectCount: number })[]
  search: string
  hideExisting: boolean
  selected: Map<number, PickEntry>
  showAdvanced: boolean
  loading: boolean
  bulkWorkerType: string
  bulkDailyWage: number
  searchRef: React.RefObject<HTMLInputElement>
  // 派生数据
  filtered: (Worker & { projectCount: number })[]
  allSelectable: (Worker & { projectCount: number })[]
  allSelected: boolean
  teamName: string | null
  hasDefaultTeam: boolean
  // setters
  setHideExisting: (b: boolean) => void
  setShowAdvanced: (b: boolean | ((prev: boolean) => boolean)) => void
  setBulkWorkerType: (s: string) => void
  setBulkDailyWage: (n: number) => void
  // 操作
  toggleWorker: (worker: Worker) => void
  toggleAll: () => void
  updateEntry: (workerId: number, field: keyof PickEntry, value: PickEntry[keyof PickEntry]) => void
  handleConfirm: () => Promise<void>
  handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export function useWorkerPicker({
  show,
  projectId,
  workerTeams,
  existingWorkerIds,
  defaultTeamId,
  onConfirm,
  onClose,
}: UseWorkerPickerParams): WorkerPickerApi {
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
    getAPI().then(api => api.getWorkers())
      .then(res => { if (res.success && res.data) setWorkers(res.data as (Worker & { projectCount: number })[]) })
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

  const updateEntry = useCallback((workerId: number, field: keyof PickEntry, value: PickEntry[keyof PickEntry]) => {
    setSelected(prev => {
      const next = new Map(prev)
      const entry = next.get(workerId)
      if (entry) next.set(workerId, { ...entry, [field]: value })
      return next
    })
  }, [])

  const handleConfirm = useCallback(async () => {
    const entries: Partial<ProjectWorker>[] = []
    for (const [, entry] of selected) {
      entries.push({
        workerId: entry.worker.id,
        projectId,
        teamId: entry.teamId ?? undefined,
        dailyWage: entry.dailyWage,
        workerType: entry.workerType,
        entryDate: new Date().toISOString().split('T')[0],
        status: 'active' as const
      })
    }
    await onConfirm(entries)
    onClose()
  }, [selected, projectId, onConfirm, onClose])

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
  }, [])

  const allSelectable = useMemo(() => filtered.filter(w => !existingWorkerIds.has(w.id)), [filtered, existingWorkerIds])
  const allSelected = allSelectable.length > 0 && selected.size === allSelectable.length
  const teamName = useMemo(() => hasDefaultTeam ? workerTeams.find(t => t.id === defaultTeamId)?.name ?? null : null, [hasDefaultTeam, workerTeams, defaultTeamId])

  return {
    workers,
    search,
    hideExisting,
    selected,
    showAdvanced,
    loading,
    bulkWorkerType,
    bulkDailyWage,
    searchRef,
    filtered,
    allSelectable,
    allSelected,
    teamName,
    hasDefaultTeam,
    setHideExisting,
    setShowAdvanced,
    setBulkWorkerType,
    setBulkDailyWage,
    toggleWorker,
    toggleAll,
    updateEntry,
    handleConfirm,
    handleSearchChange,
  }
}