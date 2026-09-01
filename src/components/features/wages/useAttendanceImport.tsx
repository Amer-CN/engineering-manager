import { useState, useCallback } from 'react'
import { getAPI } from '@/services/api-adapter'
import { usePermission } from '@/hooks/usePermission'
import { useToastStore } from '@/store/toastStore'
import { AttendanceConflictDialog, type AttendanceConflict } from './AttendanceConflictDialog'

export interface AttendanceImportRow {
  projectWorkerId: number
  workDays: number
  workerName?: string
}

interface UseAttendanceImportOptions {
  projectId: number | null
  yearMonth: string
  loadData: () => Promise<void> | void
}

/**
 * S2 带提醒覆盖：考勤导入共用链路（工资管理侧 + Payroll worker 侧）。
 * 返回 { importAttendance, ConflictDialog }——ConflictDialog 需渲染在页面内。
 */
export function useAttendanceImport({ projectId, yearMonth, loadData }: UseAttendanceImportOptions) {
  const { can } = usePermission()
  const showToast = useToastStore(state => state.showToast)
  const [conflicts, setConflicts] = useState<AttendanceConflict[]>([])

  const importAttendance = useCallback(async (data: AttendanceImportRow[]) => {
    if (!can('wages:create')) { showToast('您没有导入考勤的权限', 'error'); return }
    if (!projectId) { showToast('请先选择项目', 'warning'); return }
    try {
      const api = await getAPI()
      const res = await api.batchImportAttendances(projectId, yearMonth, data)
      if (!res.success || !res.data) { showToast(res.error || '导入失败', 'error'); return }
      const d = res.data
      const parts: string[] = []
      if (d.created > 0) parts.push(`新增 ${d.created} 条`)
      if (d.updated > 0) parts.push(`更新 ${d.updated} 条`)
      if (d.skipped && d.skipped.length > 0) parts.push(`${d.skipped.length} 条无权限跳过`)
      if (parts.length > 0) showToast(parts.join('，'), 'success')
      await loadData()
      if (d.conflicts && d.conflicts.length > 0) {
        setConflicts(d.conflicts.map((c: { projectWorkerId: number; currentWorkDays: number; importWorkDays: number }) => ({
          projectWorkerId: c.projectWorkerId,
          workerName: data.find(x => x.projectWorkerId === c.projectWorkerId)?.workerName || `工人 ${c.projectWorkerId}`,
          currentWorkDays: c.currentWorkDays,
          importWorkDays: c.importWorkDays,
        })))
      }
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '导入失败', 'error')
    }
  }, [can, projectId, yearMonth, loadData, showToast])

  const resolveConflicts = useCallback(async (resolutions: { projectWorkerId: number; action: 'overwrite' | 'keep'; workDays: number }[]) => {
    if (!projectId) return
    try {
      const api = await getAPI()
      const res = await api.resolveAttendanceConflicts(projectId, yearMonth, resolutions)
      if (!res.success || !res.data) { showToast(res.error || '冲突处理失败', 'error'); return }
      showToast(`已覆盖 ${res.data.overwritten} 条，保留 ${res.data.kept} 条`, 'success')
      setConflicts([])
      await loadData()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : '冲突处理失败', 'error')
    }
  }, [projectId, yearMonth, loadData, showToast])

  const ConflictDialog = (
    <AttendanceConflictDialog
      conflicts={conflicts}
      onSubmit={resolveConflicts}
      onCancel={() => setConflicts([])}
    />
  )

  return { importAttendance, ConflictDialog }
}
