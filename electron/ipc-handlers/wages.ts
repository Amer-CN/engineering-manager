/**
 * 工资 IPC 处理器
 * 包含工资计算引擎、CRUD 操作和统计
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'

// ═══════════════════════════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════════════════════════

function getDaysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

/**
 * 计算单个成员的实际工资
 *
 * 规则：
 * - 工人（日薪制）：日薪 × 出勤天数 + 奖金 - 扣款
 * - 管理人员（月薪制）：
 *   - 全勤（休假≤4天）：足额基本工资 + 补贴
 *   - 缺勤（休假>4天）：(基本工资/当月天数) × 出勤天数 + 补贴
 * - 社保公积金个人部分：
 *   - companyCoversSocial=true：公司承担，不扣工资
 *   - companyCoversSocial=false：从工资中扣除个人部分
 */
function calculateActualWage(
  member: any,
  attendance: any,
  bonus: number,
  deduction: number
): number {
  const daysInMonth = getDaysInMonth(attendance.yearMonth)

  if (member.memberType === 'worker') {
    // 工人：日薪 × 出勤天数 + 奖金 - 扣款
    const dailyWage = member.dailyWage || 0
    const raw = dailyWage * (attendance.workDays || 0) + (bonus || 0) - (deduction || 0)
    return Math.round(raw * 100) / 100
  } else {
    // 管理人员月薪制
    const baseSalary = member.baseSalary || 0
    const otherAllowances = member.otherAllowances || 0

    // 应发工资（基本工资 + 补贴，不含单位社保/公积金）
    let grossWage: number
    if (attendance.isFullAttendance) {
      grossWage = baseSalary + otherAllowances
    } else {
      const dailyRate = baseSalary / daysInMonth
      grossWage = dailyRate * (attendance.workDays || 0) + otherAllowances
    }

    // 社保公积金个人扣款（仅当公司不承担时扣除）
    let personalDeduction = 0
    if (!member.companyCoversSocial) {
      personalDeduction += (member.socialSecurityPersonal || 0) + (member.housingFundPersonal || 0)
    }

    const raw = grossWage + (bonus || 0) - personalDeduction - (deduction || 0)
    return Math.round(raw * 100) / 100
  }
}

/**
 * 计算个人扣款金额（仅用于记录保存）
 */
function getPersonalDeduction(member: any): number {
  if (member.companyCoversSocial) return 0
  return (member.socialSecurityPersonal || 0) + (member.housingFundPersonal || 0)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 获取工资列表
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:getAll', (_, projectId?: number, yearMonth?: string, memberId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  let records = db.wages
  if (projectId) {
    records = records.filter((w: any) => w.projectId === projectId)
  }
  if (yearMonth) {
    records = records.filter((w: any) => w.yearMonth === yearMonth)
  }
  if (memberId) {
    records = records.filter((w: any) => w.memberId === memberId)
  }
  const result = records.map((w: any) => {
    const member = db.members.find((m: any) => m.id === w.memberId)
    const project = db.projects.find((p: any) => p.id === w.projectId)
    const team = db.workerTeams.find((t: any) => t.id === member?.teamId)
    return {
      ...w,
      memberName: member?.name || '',
      memberType: member?.memberType || 'worker',
      projectName: project?.name || '',
      teamName: team?.name || ''
    }
  })
  return { success: true, data: result.sort((a: any, b: any) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )}
})

// ═══════════════════════════════════════════════════════════════════════════════
// 生成项目工资表（核心计算逻辑）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:generateForProject', (_, projectId: number, yearMonth: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  if (!db.attendances) db.attendances = []
  if (!db.members) db.members = []
  if (!db.workerTeams) db.workerTeams = []
  try {
    // 1. 获取项目成员（管理人员从 projectMembers 关联表，工人通过班组关联）
    if (!db.projectMembers) db.projectMembers = []
    const projectMembers: any[] = []
    const addedIds = new Set<number>()

    // 管理人员：从 projectMembers 关联表获取
    const staffIds = db.projectMembers
      .filter((pm: any) => pm.projectId === projectId)
      .map((pm: any) => pm.memberId)
    for (const member of db.members) {
      if (member.memberType === 'staff' && staffIds.includes(member.id)) {
        projectMembers.push(member)
        addedIds.add(member.id)
      }
    }

    // 工人：通过班组关联获取
    for (const member of db.members) {
      if (member.memberType === 'worker' && member.teamId && !addedIds.has(member.id)) {
        const team = db.workerTeams.find((t: any) => t.id === member.teamId)
        if (team && team.projectId === projectId) {
          projectMembers.push(member)
          addedIds.add(member.id)
        }
      }
    }

    // 项目经理：不在 projectMembers 表中，需单独加入
    const project = db.projects.find((p: any) => p.id === projectId)
    if (project?.projectManagerId && !addedIds.has(project.projectManagerId)) {
      const pm = db.members.find((m: any) => m.id === project.projectManagerId)
      if (pm) {
        projectMembers.push(pm)
        addedIds.add(pm.id)
      }
    }

    // 2. 删除该项目+月份的旧工资记录（重新生成）
    db.wages = db.wages.filter((w: any) => !(w.projectId === projectId && w.yearMonth === yearMonth))

    // 3. 为每个成员生成工资记录
    const now = new Date().toISOString()
    const generated: any[] = []
    const daysInMonth = getDaysInMonth(yearMonth)

    for (const member of projectMembers) {
      // 查找考勤记录
      const attendance = db.attendances.find(
        (a: any) => a.memberId === member.id && a.projectId === projectId && a.yearMonth === yearMonth
      )

      // 如果没有考勤记录，使用默认值
      const workDays = attendance?.workDays ?? (member.memberType === 'staff' ? daysInMonth - 4 : daysInMonth)
      const daysOff = attendance?.daysOff ?? (member.memberType === 'staff' ? 4 : 0)
      const isFullAttendance = attendance?.isFullAttendance ?? true

      // 计算实际工资
      const bonus = 0
      const deduction = 0
      const actualWage = calculateActualWage(member, {
        yearMonth,
        workDays,
        daysOff,
        isFullAttendance
      }, bonus, deduction)

      const wageRecord = {
        id: Date.now() + generated.length,
        projectId,
        memberId: member.id,
        yearMonth,
        baseSalary: member.baseSalary || 0,
        dailyWage: member.dailyWage || 0,
        socialSecurityCompany: member.socialSecurityCompany || 0,
        housingFund: member.housingFund || 0,
        housingFundPersonal: member.housingFundPersonal || 0,
        socialSecurityPersonal: member.socialSecurityPersonal || 0,
        companyCoversSocial: member.companyCoversSocial ?? false,
        otherAllowances: member.otherAllowances || 0,
        workDays,
        daysOff,
        isFullAttendance,
        bonus,
        deduction,
        actualWage,
        createdAt: now,
        updatedAt: now
      }

      db.wages.push(wageRecord)
      generated.push(wageRecord)
    }

    saveDatabase()

    // 4. 补充关联信息后返回
    const result = generated.map((w: any) => {
      const member = db.members.find((m: any) => m.id === w.memberId)
      const project = db.projects.find((p: any) => p.id === w.projectId)
      const team = db.workerTeams.find((t: any) => t.id === member?.teamId)
      return {
        ...w,
        memberName: member?.name || '',
        memberType: member?.memberType || 'worker',
        projectName: project?.name || '',
        teamName: team?.name || ''
      }
    })

    return { success: true, data: result }
  } catch (error: any) {
    log.error('Failed to generate project wages:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 创建单条工资记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const id = Date.now()
    const newRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.wages.push(newRecord)
    saveDatabase()
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create wage:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 更新工资记录（带重新计算）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:update', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const index = db.wages.findIndex((w: any) => w.id === record.id)
    if (index !== -1) {
      const existing = db.wages[index]
      const member = db.members.find((m: any) => m.id === existing.memberId)
      if (member) {
        // 重新计算实发工资
        const actualWage = calculateActualWage(member, {
          yearMonth: record.yearMonth || existing.yearMonth,
          workDays: record.workDays ?? existing.workDays,
          daysOff: record.daysOff ?? existing.daysOff,
          isFullAttendance: record.isFullAttendance ?? existing.isFullAttendance
        }, record.bonus ?? existing.bonus, record.deduction ?? existing.deduction)

        db.wages[index] = {
          ...existing,
          ...record,
          actualWage,
          updatedAt: new Date().toISOString()
        }
      } else {
        db.wages[index] = { ...existing, ...record, updatedAt: new Date().toISOString() }
      }
      saveDatabase()
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update wage:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 批量保存工资（替换该项目+月份的所有工资记录）
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:batchSave', (_, records: any[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    if (records.length === 0) return { success: true }

    const { projectId, yearMonth } = records[0]
    // 删除旧的
    db.wages = db.wages.filter((w: any) => !(w.projectId === projectId && w.yearMonth === yearMonth))
    // 插入新的
    const now = new Date().toISOString()
    for (const record of records) {
      db.wages.push({ ...record, updatedAt: now })
    }
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to batch save wages:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 删除工资记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    db.wages = db.wages.filter((w: any) => w.id !== id)
    saveDatabase()
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete wage:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:wages:batchDelete', (_, ids: number[]) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    const idSet = new Set(ids)
    db.wages = db.wages.filter((w: any) => !idSet.has(w.id))
    saveDatabase()
    return { success: true, data: { deleted: ids.length } }
  } catch (error: any) {
    log.error('Failed to batch delete wages:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 工资统计
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:wages:getStats', (_, yearMonth?: string, projectId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  if (!db.wages) db.wages = []
  try {
    let records = db.wages
    if (yearMonth) {
      records = records.filter((w: any) => w.yearMonth === yearMonth)
    }
    if (projectId) {
      records = records.filter((w: any) => w.projectId === projectId)
    }

    const memberIds = [...new Set(records.map((w: any) => w.memberId))]
    const members = db.members.filter((m: any) => memberIds.includes(m.id))
    const memberMap = new Map(members.map((m: any) => [m.id, m]))

    let totalWage = 0
    let staffWage = 0
    let workerWage = 0
    const projectMap = new Map<number, { projectId: number; projectName: string; total: number }>()

    for (const record of records) {
      const member = memberMap.get(record.memberId)
      totalWage += record.actualWage || 0

      if (member?.memberType === 'staff') {
        staffWage += record.actualWage || 0
      } else {
        workerWage += record.actualWage || 0
      }

      // 项目分布
      if (!projectMap.has(record.projectId)) {
        const project = db.projects.find((p: any) => p.id === record.projectId)
        projectMap.set(record.projectId, {
          projectId: record.projectId,
          projectName: project?.name || '未知项目',
          total: 0
        })
      }
      projectMap.get(record.projectId)!.total += record.actualWage || 0
    }

    // 计算百分比
    const projectBreakdown = Array.from(projectMap.values()).map(p => ({
      ...p,
      total: Math.round(p.total * 100) / 100,
      percentage: totalWage > 0 ? Math.round((p.total / totalWage) * 10000) / 100 : 0
    }))

    return {
      success: true,
      data: {
        totalWage: Math.round(totalWage * 100) / 100,
        staffWage: Math.round(staffWage * 100) / 100,
        workerWage: Math.round(workerWage * 100) / 100,
        count: records.length,
        projectBreakdown
      }
    }
  } catch (error: any) {
    log.error('Failed to get wage stats:', error)
    return { success: false, error: error.message }
  }
})
