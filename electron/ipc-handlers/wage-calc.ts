import { db, dbReady, saveDatabase, getUploadsPath } from '../database'
export { parseBankReceipt } from './wage-bank-receipt'

/** 银行回单解析后的单条明细 */
export interface BankReceiptItem {
  name: string
  amount: number
  account?: string
  date?: string
  remark?: string
}

/** 银行回单解析结果 */
export interface ParsedBankReceipt {
  date: string
  totalAmount: number
  successAmount: number
  failCount: number
  items: BankReceiptItem[]
  receiptPath: string
  rawTextSnippet?: string
}

export function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

export function calculateActualWage(
  dailyWage: number, workDays: number, bonus: number, deduction: number
): number {
  return Math.round((dailyWage * workDays + bonus - deduction) * 100) / 100
}

export function generateProjectWages(projectId: number, yearMonth: string) {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []; if (!db.attendances) db.attendances = []
  if (!db.workers) db.workers = []; if (!db.projectWorkers) db.projectWorkers = []

  const activePWs = db.projectWorkers.filter(
    (pw: any) => pw.projectId === projectId && pw.status === 'active'
  )

  // 保留已归档的记录
  const archivedWages = db.wages.filter(
    (w: any) => w.projectId === projectId && w.yearMonth === yearMonth && w.paymentLocked
  )
  const archivedPWIds = new Set(archivedWages.map((w: any) => w.projectWorkerId))
  // 只删除未归档的记录
  db.wages = db.wages.filter(
    (w: any) => !(w.projectId === projectId && w.yearMonth === yearMonth && !w.paymentLocked)
  )

  const now = new Date().toISOString()
  const daysInMonth = getDaysInMonth(yearMonth)
  let newCount = 0; let archivedSkipped = 0; let generated: any[] = []

  // 预加载 wageHistory 查找表
  const effectiveWageMap = new Map<number, number>()
  if (db.wageHistory) {
    for (const pwId of activePWs.map((p: any) => p.id)) {
      const records = db.wageHistory
        .filter((h: any) => h.projectWorkerId === pwId && h.yearMonth <= yearMonth)
        .sort((a: any, b: any) => b.yearMonth.localeCompare(a.yearMonth))
      const effective = records[0]
      effectiveWageMap.set(pwId, effective ? effective.dailyWage : 0)
    }
  }

  for (const pw of activePWs) {
    if (archivedPWIds.has(pw.id)) {
      generated.push(archivedWages.find((w: any) => w.projectWorkerId === pw.id))
      archivedSkipped++
      continue
    }
    const worker = db.workers.find((w: any) => w.id === pw.workerId)
    if (!worker) continue

    const attendance = db.attendances.find(
      (a: any) => a.projectWorkerId === pw.id && a.yearMonth === yearMonth
    )
    if (!attendance) continue

    const dailyWage = effectiveWageMap.get(pw.id) || worker.dailyWage || pw.dailyWage || 0
    const workDays = attendance.workDays ?? daysInMonth
    const actualWage = calculateActualWage(dailyWage, workDays, 0, 0)

    const wageRecord: any = {
      id: Date.now() + generated.length, projectId,
      memberId: undefined, projectWorkerId: pw.id,
      yearMonth, dailyWage, workDays,
      bonus: 0, deduction: 0, actualWage,
      createdAt: now, updatedAt: now
    }
    db.wages.push(wageRecord); generated.push(wageRecord); newCount++
  }

  // 兜底去重
  const seen = new Set<string>()
  db.wages = db.wages.filter((w: any) => {
    const key = `${w.projectWorkerId}-${w.yearMonth}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  saveDatabase()

  return {
    success: true,
    data: generated.map((w: any) => {
      let memberName = ''; let teamName = ''
      if (w.projectWorkerId && db.projectWorkers) {
        const pw = db.projectWorkers.find((p: any) => p.id === w.projectWorkerId)
        if (pw && db.workers) {
          const worker = db.workers.find((wk: any) => wk.id === pw.workerId)
          memberName = worker?.name || ''
          const team = db.workerTeams?.find((t: any) => t.id === pw.teamId)
          teamName = team?.name || ''
        }
      }
      const project = db.projects?.find((p: any) => p.id === w.projectId)
      return { ...w, memberName, memberType: 'worker', projectName: project?.name || '', teamName }
    }),
    newCount, archivedSkipped,
  }
}
