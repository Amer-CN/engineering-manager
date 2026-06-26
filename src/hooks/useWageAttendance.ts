import { useCallback } from 'react'
import type { AttendanceRecord } from '@/types'
import { getAPI } from '@/services/api-adapter'

interface UseWageAttendanceOptions {
  selectedProject: { id: number } | null
  selectedMonth: string
  workerPwIds: number[]
  setAttendances: (v: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => void
  setLoading: (v: boolean) => void
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
  confirm: (opts: { title: string; content: string; confirmVariant: 'primary' | 'danger' }) => Promise<boolean>
}

export function useWageAttendance({
  selectedProject, selectedMonth, workerPwIds,
  setAttendances, setLoading, showToast, confirm,
}: UseWageAttendanceOptions) {
  const loadAttendances = useCallback(async () => {
    if (!selectedProject) return
    try {
      const result = await (await getAPI()).getAttendances(selectedProject.id, selectedMonth)
      if (result.success && result.data) setAttendances(result.data)
    } catch (error) { console.error('加载考勤失败:', error) }
  }, [selectedProject, selectedMonth])

  const handleGenerateAttendance = async () => {
    if (!selectedProject) return
    if (workerPwIds.length === 0) {
      showToast('该项目没有活跃工人，请先在项目详情页→人员管理中添加工人班组', 'warning'); return
    }
    setLoading(true)
    try {
      const r = await (await getAPI()).generateDefaultAttendancesV2(selectedProject.id, selectedMonth, workerPwIds)
      if (r.success && r.data && r.data.count > 0) { showToast(`已为 ${r.data.count} 名工人生成考勤记录`, 'success'); await loadAttendances() }
      else showToast('所有工人已有考勤记录', 'info')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '生成考勤失败', 'error') }
    finally { setLoading(false) }
  }

  const handleDeleteAttendance = async (record: AttendanceRecord) => {
    const ok = await confirm({
      title: '确认删除',
      content: `确认删除 ${record.memberName || '该工人'} 的考勤记录吗？`,
      confirmVariant: 'danger',
    })
    if (!ok) return
    try {
      const result = await (await getAPI()).deleteAttendance(record.id)
      if (result.success) { showToast('考勤记录已删除', 'success'); await loadAttendances() }
      else showToast(result.error || '删除失败', 'error')
    } catch (error: unknown) { showToast(error instanceof Error ? error.message : '删除失败', 'error') }
  }

  return { loadAttendances, handleGenerateAttendance, handleDeleteAttendance }
}
