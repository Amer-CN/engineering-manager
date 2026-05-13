import { db, dbReady, saveDatabase } from '../database'

export function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function calculateActualWage(member: any, attendance: any, bonus: number, deduction: number): number {
  const daysInMonth = getDaysInMonth(attendance.yearMonth)
  if (member.memberType === 'worker') {
    const dailyWage = member.dailyWage || 0
    return Math.round((dailyWage * (attendance.workDays || 0) + (bonus || 0) - (deduction || 0)) * 100) / 100
  }
  const baseSalary = member.baseSalary || 0
  const otherAllowances = member.otherAllowances || 0
  let grossWage: number
  if (attendance.isFullAttendance) { grossWage = baseSalary + otherAllowances }
  else { grossWage = (baseSalary / daysInMonth) * (attendance.workDays || 0) + otherAllowances }
  let personalDeduction = 0
  if (!member.companyCoversSocial) { personalDeduction += (member.socialSecurityPersonal || 0) + (member.housingFundPersonal || 0) }
  return Math.round((grossWage + (bonus || 0) - personalDeduction - (deduction || 0)) * 100) / 100
}

export function getPersonalDeduction(member: any): number {
  if (member.companyCoversSocial) return 0
  return (member.socialSecurityPersonal || 0) + (member.housingFundPersonal || 0)
}

export function generateProjectWages(projectId: number, yearMonth: string) {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []; if (!db.attendances) db.attendances = []; if (!db.members) db.members = []
  if (!db.workerTeams) db.workerTeams = []; if (!db.projectMembers) db.projectMembers = []
  if (!db.workers) db.workers = []; if (!db.projectWorkers) db.projectWorkers = []

  const projectMemberIds: number[] = []
  const addedIds = new Set<number>()

  // Staff: via db.projectMembers
  const staffIds = db.projectMembers.filter((pm: any) => pm.projectId === projectId).map((pm: any) => pm.memberId)
  for (const member of db.members) {
    if (member.memberType === 'staff' && staffIds.includes(member.id)) {
      projectMemberIds.push(member.id)
      addedIds.add(member.id)
    }
  }

  // Workers: via db.projectWorkers (new path — only active, not left)
  const activePWs = db.projectWorkers.filter((pw: any) => pw.projectId === projectId && pw.status === 'active')
  for (const pw of activePWs) {
    const worker = db.workers.find((w: any) => w.id === pw.workerId)
    if (!worker) continue
    // Store as pseudo-member with projectWorker-derived fields
    const pseudoId = -(pw.id) // negative to avoid collision with real member IDs
    ;(db.members as any).push({
      id: pseudoId,
      name: worker.name,
      memberType: 'worker',
      dailyWage: pw.dailyWage,
      workerType: pw.workerType,
      teamId: pw.teamId,
      _projectWorkerId: pw.id,
      _isWorkerProxy: true
    })
    projectMemberIds.push(pseudoId)
    addedIds.add(pseudoId)
  }

  // Fallback: legacy workers via members table (non-migrated)
  for (const member of db.members) {
    if (member.memberType === 'worker' && (member as any)._isWorkerProxy) continue
    if (member.memberType === 'worker' && member.teamId && !addedIds.has(member.id)) {
      const team = db.workerTeams.find((t: any) => t.id === member.teamId)
      if (team?.projectId === projectId) {
        projectMemberIds.push(member.id)
        addedIds.add(member.id)
      }
    }
  }

  const project = db.projects.find((p: any) => p.id === projectId)
  if (project?.projectManagerId && !addedIds.has(project.projectManagerId)) {
    const pm = db.members.find((m: any) => m.id === project.projectManagerId)
    if (pm) { projectMemberIds.push(pm.id); addedIds.add(pm.id) }
  }

  db.wages = db.wages.filter((w: any) => !(w.projectId === projectId && w.yearMonth === yearMonth))
  const now = new Date().toISOString(); const generated: any[] = []; const daysInMonth = getDaysInMonth(yearMonth)

  for (const memberId of projectMemberIds) {
    const member = db.members.find((m: any) => m.id === memberId)
    if (!member) continue
    const isWorkerProxy = !!(member as any)._isWorkerProxy
    const projectWorkerId = (member as any)._projectWorkerId || undefined

    const attendance = db.attendances.find((a: any) => {
      if (isWorkerProxy && projectWorkerId) return a.projectWorkerId === projectWorkerId && a.yearMonth === yearMonth
      return a.memberId === member.id && a.projectId === projectId && a.yearMonth === yearMonth
    })
    const workDays = attendance?.workDays ?? (member.memberType === 'staff' ? daysInMonth - 4 : daysInMonth)
    const daysOff = attendance?.daysOff ?? (member.memberType === 'staff' ? 4 : 0)
    const actualWage = calculateActualWage(member, { yearMonth, workDays, daysOff, isFullAttendance: attendance?.isFullAttendance ?? true }, 0, 0)
    const wageRecord: any = {
      id: Date.now() + generated.length, projectId,
      memberId: isWorkerProxy ? undefined : member.id,
      projectWorkerId,
      yearMonth,
      baseSalary: member.baseSalary || 0, dailyWage: member.dailyWage || 0,
      socialSecurityCompany: member.socialSecurityCompany || 0, housingFund: member.housingFund || 0,
      housingFundPersonal: member.housingFundPersonal || 0, socialSecurityPersonal: member.socialSecurityPersonal || 0,
      companyCoversSocial: member.companyCoversSocial ?? false, otherAllowances: member.otherAllowances || 0,
      workDays, daysOff, isFullAttendance: attendance?.isFullAttendance ?? true, bonus: 0, deduction: 0, actualWage,
      createdAt: now, updatedAt: now
    }
    db.wages.push(wageRecord); generated.push(wageRecord)
  }

  // Clean up proxy members
  db.members = db.members.filter((m: any) => !(m as any)._isWorkerProxy)

  saveDatabase()

  return { success: true, data: generated.map((w: any) => {
    let memberName = ''; let memberType = 'worker'; let teamName = ''
    if (w.projectWorkerId && db.projectWorkers) {
      const pw = db.projectWorkers.find((p: any) => p.id === w.projectWorkerId)
      if (pw && db.workers) {
        const worker = db.workers.find((wk: any) => wk.id === pw.workerId)
        memberName = worker?.name || ''
        const team = db.workerTeams?.find((t: any) => t.id === pw.teamId)
        teamName = team?.name || ''
      }
    } else {
      const member = db.members.find((m: any) => m.id === w.memberId)
      memberName = member?.name || ''
      memberType = member?.memberType || 'worker'
      const team = db.workerTeams?.find((t: any) => t.id === member?.teamId)
      teamName = team?.name || ''
    }
    const project = db.projects?.find((p: any) => p.id === w.projectId)
    return { ...w, memberName, memberType, projectName: project?.name || '', teamName }
  })}
}
