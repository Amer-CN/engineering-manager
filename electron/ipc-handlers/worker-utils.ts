/**
 * 工人/用工关系工具函数
 * 从 workers.ts 拆分，供 IPC handler 共用
 */
import { db } from '../database'

/** 计算考勤首日（从 dailyStatus 推断） */
export function getAttendanceFirstDay(
  db: any,
  pwId: number,
  yearMonth: string
): string {
  if (!db.attendances) return ''
  for (const att of db.attendances) {
    if (att.projectWorkerId !== pwId) continue
    if (!att.dailyStatus) continue
    const ds = att.dailyStatus
    const days = Object.keys(ds).map(Number).filter(d => d > 0 && ds[d])
    if (days.length === 0) continue
    const firstDay = Math.min(...days)
    return `${yearMonth}-${String(firstDay).padStart(2, '0')}`
  }
  return ''
}

/** 富化单个 projectWorker（补充 worker/team/project 信息） */
export function enrichProjectWorker(pw: any, db: any): any {
  const worker = db.workers?.find((w: any) => w.id === pw.workerId)
  const team = db.workerTeams?.find((t: any) => t.id === pw.teamId)
  const project = db.projects?.find((p: any) => p.id === pw.projectId)
  return {
    ...pw,
    worker: worker || null,
    workerName: worker?.name || '',
    workerIdCard: worker?.idCard || '',
    teamName: team?.name || '',
    projectName: project?.name || '',
  }
}

/** 富化工人的项目统计（用于 getStats） */
export function computeWorkerProjectStats(workerId: number, db: any): {
  projectCount: number
  totalEarnings: number
  projectBreakdown: { projectId: number; projectName: string; total: number }[]
} {
  if (!db.projectWorkers) db.projectWorkers = []
  if (!db.wages) db.wages = []
  if (!db.workers) db.workers = []

  const pws = db.projectWorkers.filter((pw: any) => pw.workerId === workerId)
  let totalEarnings = 0
  const projectBreakdown: { projectId: number; projectName: string; total: number }[] = []

  for (const pw of pws) {
    const project = db.projects?.find((p: any) => p.id === pw.projectId)
    const wages = db.wages.filter((w: any) => w.projectWorkerId === pw.id)
    const total = wages.reduce((sum: number, w: any) => sum + (w.actualWage || 0), 0)
    totalEarnings += total
    projectBreakdown.push({
      projectId: pw.projectId,
      projectName: project?.name || '未知项目',
      total
    })
  }

  return { projectCount: pws.length, totalEarnings, projectBreakdown }
}
