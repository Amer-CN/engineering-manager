/**
 * 成员 IPC 处理器
 * 双写：SQLite（members、worker_teams、worker_transfer_records、project_members 四张表）
 */

import { ipcMain } from 'electron'
import log from 'electron-log'
import { db, dbReady, saveDatabase } from '../database'
import { useSqliteRead, shouldFallbackToJson, memberQueries } from '../sqlite/queries'

// ═══════════════════════════════════════════════════════════════════════════════
// 成员 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:members:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = memberQueries.listMembers()
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  return { success: true, data: db.members.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:members:create', (_, member) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newMember = { ...member, id, createdAt: new Date().toISOString() }
    db.members.push(newMember)

    // Auto-create initial salary history entry
    if (member.baseSalary && Number(member.baseSalary) > 0) {
      if (!db.salaryHistory) db.salaryHistory = []
      const salaryEntry = {
        id: Date.now() + 1,
        memberId: id,
        effectiveDate: member.entryDate || new Date().toISOString().split('T')[0],
        baseSalary: Number(member.baseSalary),
        subsidy: 0,
        subsidyNote: '',
        note: '入职初始薪资',
        createdAt: new Date().toISOString()
      }
      db.salaryHistory.push(salaryEntry)
      // SQLite 双写：薪资历史
      memberQueries.createSalaryHistory(salaryEntry)
    }

    saveDatabase()
    // SQLite 双写：成员
    memberQueries.createMember(newMember)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create member:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:members:update', (_, member) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.members.findIndex((m: any) => m.id === member.id)
    if (index !== -1) {
      db.members[index] = { ...db.members[index], ...member }
      saveDatabase()
      // SQLite 双写
      memberQueries.updateMember(db.members[index])
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update member:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:members:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    db.members = db.members.filter((m: any) => m.id !== id)
    saveDatabase()
    // SQLite 双写
    memberQueries.deleteMember(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete member:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 农民工班组 CRUD
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:workerTeams:getAll', () => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = memberQueries.listTeams()
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  const teams = db.workerTeams.map((t: any) => {
    const project = db.projects.find((p: any) => p.id === t.projectId)
    const leader = db.members.find((m: any) => m.id === t.leaderId)
    return {
      ...t,
      projectName: project?.name || '',
      leaderName: leader?.name || ''
    }
  })
  return { success: true, data: teams.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )}
})

ipcMain.handle('db:workerTeams:create', (_, team) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // 检查同名班组是否存在
    const exists = db.workerTeams.find((t: any) =>
      t.name === team.name && t.projectId === team.projectId
    )
    if (exists) {
      return { success: false, error: '该项目下已存在同名班组' }
    }
    const id = Date.now()
    const newTeam = {
      ...team,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    db.workerTeams.push(newTeam)
    saveDatabase()
    // SQLite 双写
    memberQueries.createTeam(newTeam)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create team:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workerTeams:update', (_, team) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const index = db.workerTeams.findIndex((t: any) => t.id === team.id)
    if (index !== -1) {
      db.workerTeams[index] = { ...db.workerTeams[index], ...team, updatedAt: new Date().toISOString() }
      saveDatabase()
      // SQLite 双写
      memberQueries.updateTeam(db.workerTeams[index])
    }
    return { success: true }
  } catch (error: any) {
    log.error('Failed to update team:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:workerTeams:delete', (_, id) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    // 检查是否有工人属于该班组
    let workersInTeam = 0
    if (db.projectWorkers) {
      workersInTeam = db.projectWorkers.filter((pw: any) => pw.teamId === id && pw.status === 'active').length
    }
    // Fallback to old check for non-migrated data
    if (workersInTeam === 0) {
      workersInTeam = db.members.filter((m: any) => m.memberType === 'worker' && m.teamId === id).length
    }
    if (workersInTeam.length > 0) {
      return { success: false, error: `该班组下有 ${workersInTeam.length} 名工人，无法删除` }
    }
    db.workerTeams = db.workerTeams.filter((t: any) => t.id !== id)
    saveDatabase()
    // SQLite 双写
    memberQueries.deleteTeam(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to delete team:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 工人调动记录
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:workerTransferRecords:getAll', (_, workerId?: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = memberQueries.listTransferRecords(workerId)
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  let records = db.workerTransferRecords
  if (workerId) {
    records = records.filter((r: any) => r.workerId === workerId)
  }
  return { success: true, data: records.sort((a: any, b: any) =>
    new Date(b.transferDate).getTime() - new Date(a.transferDate).getTime()
  )}
})

ipcMain.handle('db:workerTransferRecords:create', (_, record) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    const id = Date.now()
    const newRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString()
    }
    db.workerTransferRecords.push(newRecord)
    saveDatabase()
    // SQLite 双写
    memberQueries.createTransferRecord(newRecord)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to create transfer record:', error)
    return { success: false, error: error.message }
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
// 项目成员关联
// ═══════════════════════════════════════════════════════════════════════════════

ipcMain.handle('db:projectMembers:getAll', (_, projectId: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  // SQLite 优先
  if (useSqliteRead()) {
    const data = memberQueries.listProjectMembers(projectId)
    if (data !== null) return { success: true, data }
  }
  // JSON 回退
  if (!shouldFallbackToJson()) return { success: false, error: 'SQLite read failed (sqlite-primary mode)' }
  if (!db.projectMembers) db.projectMembers = []
  const records = db.projectMembers
    .filter((pm: any) => pm.projectId === projectId)
    .map((pm: any) => {
      const member = db.members.find((m: any) => m.id === pm.memberId)
      return { ...pm, member: member || null }
    })
    .sort((a: any, b: any) =>
      new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime()
    )
  return { success: true, data: records }
})

ipcMain.handle('db:projectMembers:add', (_, projectId: number, memberId: number, joinedAt?: string) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.projectMembers) db.projectMembers = []
    const exists = db.projectMembers.find((pm: any) =>
      pm.projectId === projectId && pm.memberId === memberId && !pm.leftAt
    )
    if (exists) {
      return { success: false, error: '该成员已在项目中' }
    }
    const id = Date.now()
    const entry = {
      id,
      projectId,
      memberId,
      joinedAt: joinedAt || new Date().toISOString().split('T')[0],
    }
    db.projectMembers.push(entry)
    saveDatabase()
    // SQLite 双写
    memberQueries.addProjectMember(entry)
    return { success: true, data: { id } }
  } catch (error: any) {
    log.error('Failed to add project member:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectMembers:update', (_, id: number, updates: { leftAt?: string; joinedAt?: string }) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.projectMembers) db.projectMembers = []
    const index = db.projectMembers.findIndex((pm: any) => pm.id === id)
    if (index === -1) return { success: false, error: '记录不存在' }
    const record = db.projectMembers[index]
    if (updates.leftAt !== undefined) record.leftAt = updates.leftAt || undefined
    if (updates.joinedAt !== undefined) record.joinedAt = updates.joinedAt
    record.updatedAt = new Date().toISOString()
    db.projectMembers[index] = record
    saveDatabase()
    // SQLite 双写
    memberQueries.updateProjectMember(id, record)
    return { success: true, data: record }
  } catch (error: any) {
    log.error('Failed to update project member:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('db:projectMembers:remove', (_, id: number) => {
  if (!dbReady) return { success: false, error: 'Database not ready' }
  try {
    if (!db.projectMembers) db.projectMembers = []
    db.projectMembers = db.projectMembers.filter((pm: any) => pm.id !== id)
    saveDatabase()
    // SQLite 双写
    memberQueries.removeProjectMember(id)
    return { success: true }
  } catch (error: any) {
    log.error('Failed to remove project member:', error)
    return { success: false, error: error.message }
  }
})
