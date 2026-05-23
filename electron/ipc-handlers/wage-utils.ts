/**
 * 工资工具函数
 * 从 wages.ts 拆分，供 IPC handler 共用
 */

/** 去重：同 projectWorkerId/memberId + yearMonth 只保留最新 */
export function dedupWages(records: any[]): any[] {
  const deduped = new Map<string, any>()
  for (const w of records) {
    const key = w.memberId
      ? `staff-${w.memberId}-${w.yearMonth}`
      : `worker-${w.projectWorkerId}-${w.yearMonth}`
    if (!deduped.has(key) || new Date(w.updatedAt).getTime() > new Date(deduped.get(key).updatedAt).getTime()) {
      deduped.set(key, w)
    }
  }
  return Array.from(deduped.values())
}

/** 富化工资记录（从 db 补充 memberName/memberType/teamName/bankAccount/projectName） */
export function enrichWage(w: any, db: any): any {
  let memberName = ''; let memberType = 'worker'; let teamName = ''; let bankAccount = ''
  if (w.memberId) {
    const member = db.members?.find((m: any) => m.id === w.memberId)
    memberName = member?.name || ''
    memberType = member?.memberType || 'worker'
    const team = db.workerTeams?.find((t: any) => t.id === member?.teamId)
    teamName = team?.name || ''
  } else if (w.projectWorkerId && db.projectWorkers) {
    const pw = db.projectWorkers.find((p: any) => p.id === w.projectWorkerId)
    if (pw && db.workers) {
      const worker = db.workers.find((wk: any) => wk.id === pw.workerId)
      memberName = worker?.name || ''
      bankAccount = worker?.bankAccount || ''
      const team = db.workerTeams?.find((t: any) => t.id === pw.teamId)
      teamName = team?.name || ''
    }
  }
  const project = db.projects?.find((p: any) => p.id === w.projectId)
  return { ...w, memberName, memberType, projectName: project?.name || '', teamName, bankAccount }
}

/** 从工资记录列表计算统计信息（供 getStats JSON 回退使用） */
export function computeWageStats(records: any[], db: any): {
  totalWage: number
  count: number
  projectBreakdown: { projectId: number; projectName: string; total: number; percentage: number }[]
} {
  let totalWage = 0
  const projectMap = new Map<number, { projectId: number; projectName: string; total: number }>()

  for (const record of records) {
    totalWage += record.actualWage || 0

    if (!projectMap.has(record.projectId)) {
      const project = db.projects?.find((p: any) => p.id === record.projectId)
      projectMap.set(record.projectId, {
        projectId: record.projectId,
        projectName: project?.name || '未知项目',
        total: 0
      })
    }
    projectMap.get(record.projectId)!.total += record.actualWage || 0
  }

  const projectBreakdown = Array.from(projectMap.values()).map(p => ({
    ...p,
    total: Math.round(p.total * 100) / 100,
    percentage: totalWage > 0 ? Math.round((p.total / totalWage) * 10000) / 100 : 0
  }))

  return {
    totalWage: Math.round(totalWage * 100) / 100,
    count: records.length,
    projectBreakdown
  }
}
